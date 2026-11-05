import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { readConfig, updateConfig } from "../config.ts";
import { seal, unseal, type Sealer } from "../server/database.ts";

// The desktop app's device key (see @apc/shared/devices): an ECDSA P-256 key pair made on its first login, whose
// private key the main process keeps in config.json sealed by safeStorage (DPAPI), tied to the Windows user, as the
// database's key is. The page never sees it: through the preload it asks for the public key and for a nonce's
// signature, and only the app's own page is answered (see main.ts). A key this Windows user can't open makes a new
// one, which the server's computer authorizes at once.

/** The channels the page asks on (also written in preload.cts, which can't import this file). */
export const DEVICE_CHANNELS = { publicKey: "apc:device-public-key", sign: "apc:device-sign" } as const;

/**
 * Gives the device's private key, making it the first time, or again when this Windows user can't open it.
 * @param userData The app's userData folder, where config.json is.
 * @param sealer safeStorage.
 * @returns The private key.
 */
export function ensureDeviceKey(userData: string, sealer: Sealer): KeyObject {
  const sealed = readConfig(userData).deviceKey;
  const pem = sealed ? unseal(sealed, sealer) : undefined;
  if (pem) {
    return createPrivateKey(pem);
  }
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  updateConfig(userData, { deviceKey: seal(privateKey.export({ type: "pkcs8", format: "pem" }).toString(), sealer) });
  return privateKey;
}

/**
 * Gives a device key's public half, as the API keeps it.
 * @param key The private key.
 * @returns SPKI in base64url.
 */
export function devicePublicKey(key: KeyObject): string {
  return createPublicKey(key).export({ type: "spki", format: "der" }).toString("base64url");
}

/**
 * Signs a nonce, as the API checks it.
 * @param key The private key.
 * @param nonce The nonce the API handed out.
 * @returns ECDSA with SHA-256, as r and s (IEEE P1363), in base64url.
 */
export function signNonce(key: KeyObject, nonce: string): string {
  return sign("sha256", Buffer.from(nonce, "utf8"), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
}
