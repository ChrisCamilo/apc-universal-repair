import { createHash, X509Certificate } from "node:crypto";
import { generate } from "selfsigned";
import { LOCAL_HOST } from "./bundledServer.ts";
import { seal, unseal, type Sealer } from "./database.ts";
import { readConfig, updateConfig } from "../config.ts";

// The certificate the server the app ships answers HTTPS with while the phone's access is on, so the phone's password,
// session and data never cross the home Wi-Fi in clear text. The app makes it the first time the access is turned on:
// self-signed, ECDSA P-256, kept in config.json, its private key sealed by safeStorage (DPAPI) as the database's key
// is. No authority vouches for it: the phone trusts it by its SHA-256 fingerprint, handed over by the Servidor
// dialog's QR code (see @apc/domain/pairing), and so does this app for its own requests to https://127.0.0.1 (the
// page's, through protocol.ts, and the health checks): Chromium asks certificateVerdict about each certificate. A key
// this Windows user can't open makes a new certificate, which the phone then pairs with again. The certificate names
// no address, since the computer's changes: a phone that pinned it only scans again to follow a new address.

/** Chromium's verdicts, as setCertificateVerifyProc takes them: trusted, refused, or its own verification's. */
export const VERDICT = { trusted: 0, refused: -2, chromium: -3 } as const;
/** How long the certificate lasts: the phone and the app check its fingerprint, never its dates. */
const VALID_YEARS = 20;

/** The server's certificate and private key, PEM, and the certificate's fingerprint as the pairing carries it. */
export type ServerCertificate = { cert: string; key: string; fingerprint: string };

/**
 * Gives a certificate's fingerprint, as the pairing link and the phone write it.
 * @param cert The certificate, PEM.
 * @returns The SHA-256 of its DER, in base64url without padding.
 */
export function certificateFingerprint(cert: string): string {
  return createHash("sha256").update(new X509Certificate(cert).raw).digest("base64url");
}

/**
 * Tells Chromium whether to trust a certificate: on 127.0.0.1, only the server's own while it answers HTTPS; anywhere
 * else, what Chromium's own verification says, as for GitHub's.
 * @param hostname The address asked, e.g. "127.0.0.1".
 * @param fingerprint The certificate's fingerprint, as Electron gives it, e.g. "sha256/q1Wn…=".
 * @param pinned The server's certificate's fingerprint, as certificateFingerprint gives it, or undefined while it answers
 * plain HTTP.
 * @returns One of VERDICT.
 */
export function certificateVerdict(hostname: string, fingerprint: string, pinned: string | undefined): number {
  if (hostname !== LOCAL_HOST || !pinned) {
    return VERDICT.chromium;
  }
  return fingerprint === `sha256/${Buffer.from(pinned, "base64url").toString("base64")}` ? VERDICT.trusted : VERDICT.refused;
}

/**
 * Gives the server's certificate, making it the first time, or again when this Windows user can't open its key.
 * @param userData The app's userData folder, where config.json is.
 * @param sealer safeStorage.
 * @returns The certificate, its key and its fingerprint.
 */
export async function ensureCertificate(userData: string, sealer: Sealer): Promise<ServerCertificate> {
  const config = readConfig(userData);
  const key = config.httpsKey ? unseal(config.httpsKey, sealer) : undefined;
  if (config.httpsCertificate && key) {
    return { cert: config.httpsCertificate, key, fingerprint: certificateFingerprint(config.httpsCertificate) };
  }
  const notBeforeDate = new Date();
  const notAfterDate = new Date(notBeforeDate);
  notAfterDate.setFullYear(notAfterDate.getFullYear() + VALID_YEARS);
  const made = await generate([{ name: "commonName", value: "APC Universal Repair" }], {
    keyType: "ec",
    curve: "P-256",
    algorithm: "sha256",
    notBeforeDate,
    notAfterDate,
    extensions: [
      { name: "basicConstraints", cA: false },
      { name: "keyUsage", digitalSignature: true, critical: true },
      { name: "extKeyUsage", serverAuth: true },
    ],
  });
  updateConfig(userData, { httpsCertificate: made.cert, httpsKey: seal(made.private, sealer) });
  return { cert: made.cert, key: made.private, fingerprint: certificateFingerprint(made.cert) };
}
