import assert from "node:assert/strict";
import { createHash, createPrivateKey, X509Certificate } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, request } from "node:https";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import type { TLSSocket } from "node:tls";
import { certificateFingerprint, certificateVerdict, ensureCertificate, VERDICT } from "./certificate.ts";
import type { Sealer } from "./database.ts";
import { readConfig } from "../config.ts";

// The server's certificate for the phone's access: made once, kept in config.json with its key sealed, and the only
// one the app trusts on 127.0.0.1.

/** Stands in for safeStorage: flips every byte, so a sealed key never reads as the key. */
const SEALER: Sealer = {
  encryptString: (text) => Buffer.from(Buffer.from(text, "utf8").map((byte) => byte ^ 0xff)),
  decryptString: (sealed) => Buffer.from(sealed.map((byte) => byte ^ 0xff)).toString("utf8"),
};

const folders: string[] = [];
after(() => folders.forEach((folder) => rmSync(folder, { recursive: true, force: true })));

/**
 * Makes an empty userData folder.
 * @returns Its path.
 */
function userData(): string {
  const folder = mkdtempSync(path.join(tmpdir(), "apc-desktop-cert-"));
  folders.push(folder);
  return folder;
}

// Makes the certificate, and checks it is ECDSA P-256 for a server, kept in config.json with its key sealed and never
// in plain text, and given back the same, not made again, on the next start.
test("Desktop: the server's certificate is made once, with its key sealed", async () => {
  const folder = userData();
  const made = await ensureCertificate(folder, SEALER);
  const certificate = new X509Certificate(made.cert);
  assert.equal(certificate.publicKey.asymmetricKeyType, "ec");
  assert.equal(certificate.publicKey.asymmetricKeyDetails?.namedCurve, "prime256v1");
  assert.equal(certificate.checkPrivateKey(createPrivateKey(made.key)), true);
  assert.equal(made.fingerprint, createHash("sha256").update(certificate.raw).digest("base64url"));

  const text = readFileSync(path.join(folder, "config.json"), "utf8");
  assert.equal(text.includes("PRIVATE KEY"), false);
  assert.equal(readConfig(folder).httpsCertificate, made.cert);
  assert.deepEqual(await ensureCertificate(folder, SEALER), made);
});

// Seals a certificate's key, then reads it as another Windows user, who can't open it, and checks a new certificate
// is made in its place.
test("Desktop: a certificate whose key can't be opened is made again", async () => {
  const folder = userData();
  const made = await ensureCertificate(folder, SEALER);
  const refusing: Sealer = { ...SEALER, decryptString: () => assert.fail("Not this Windows user's.") };
  const again = await ensureCertificate(folder, refusing);
  assert.notEqual(again.fingerprint, made.fingerprint);
});

// Serves HTTPS with the certificate, as the API does, and checks the fingerprint the phone and the QR code get is the
// one of the certificate the server shows.
test("Desktop: the fingerprint the pairing carries is the one the server shows", async () => {
  const made = await ensureCertificate(userData(), SEALER);
  const server = createServer({ cert: made.cert, key: made.key }, (_request, response) => response.end("ok"));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const shown = await new Promise<string>((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port: (server.address() as AddressInfo).port, rejectUnauthorized: false }, (response) => {
      response.resume();
      resolve(certificateFingerprint((response.socket as TLSSocket).getPeerX509Certificate()!.toString()));
    });
    req.on("error", reject);
    req.end();
  });
  server.close();
  assert.equal(shown, made.fingerprint);
});

// Asks for verdicts as Chromium does, with Electron's "sha256/<base64>": on 127.0.0.1 the server's own certificate is
// trusted and another refused; elsewhere, or while the server answers plain HTTP, Chromium's own verification decides.
test("Desktop: the app trusts only its server's certificate on 127.0.0.1", async () => {
  const made = await ensureCertificate(userData(), SEALER);
  const other = await ensureCertificate(userData(), SEALER);
  const electron = (fingerprint: string) => `sha256/${Buffer.from(fingerprint, "base64url").toString("base64")}`;
  assert.equal(certificateVerdict("127.0.0.1", electron(made.fingerprint), made.fingerprint), VERDICT.trusted);
  assert.equal(certificateVerdict("127.0.0.1", electron(other.fingerprint), made.fingerprint), VERDICT.refused);
  assert.equal(certificateVerdict("api.github.com", electron(other.fingerprint), made.fingerprint), VERDICT.chromium);
  assert.equal(certificateVerdict("127.0.0.1", electron(other.fingerprint), undefined), VERDICT.chromium);
});
