import { z } from "zod";

// Each device that logs in is authorized once on the server's computer. Every app makes, on its first run, a key pair
// of its own, ECDSA P-256, whose private key never leaves the device: the phone keeps it in the Android Keystore, the
// desktop app in its main process sealed by Windows (DPAPI), and a browser as a WebCrypto key it can't export. The
// server keeps only public keys. To log in or sign up, a device asks GET /devices/challenge for a nonce, which lives a
// couple of minutes and works once, and sends its public key and its signature of the nonce with the password. An
// unknown key is recorded as pending and the login answers 403 with the key's short code, which the device shows and the
// server's computer shows beside "Autorizar"; once approved there, the same key logs in. A device asks whether it was
// approved with POST /devices/status, proving it holds the key the same way. A key from the server's computer itself is
// authorized at once. These are the shared rules: the schemas, signing and checking a nonce, and a key's short code.
// Signing and checking (deviceCrypto.ts) go through WebCrypto, as in browsers and Node; the phone signs in native code
// (DeviceKeyModule.kt), the same way.

/** How many characters a key's short code has. */
export const DEVICE_CODE_LENGTH = 6;
/** The longest name the approver can give a device. */
export const DEVICE_NAME_MAX_LENGTH = 60;
/** How often a device waiting for approval asks whether it was approved, in milliseconds. */
export const DEVICE_POLL_MS = 3_000;
/** What the apps say about devices, in Portuguese. */
export const DEVICE_MESSAGES = {
  pending: "Este dispositivo precisa ser autorizado no computador do servidor.",
  pendingHelp: "No computador do servidor, abra o APC e autorize o dispositivo com este código. Este aviso some sozinho quando ele for autorizado.",
  refused: "Este dispositivo não foi autorizado. Entre de novo para pedir outra vez.",
  approveTitle: "Autorizar este dispositivo?",
  devices: "Dispositivos",
} as const;

/** base64url without padding, as keys, nonces and signatures travel. */
const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** What a device sends to prove it holds its key: its public key (SPKI), the nonce and its signature of it. */
export const deviceProofSchema = z.object({
  publicKey: z.string().regex(BASE64URL).max(256),
  nonce: z.string().regex(BASE64URL).max(64),
  signature: z.string().regex(BASE64URL).max(128),
});
/** A nonce to sign, as GET /devices/challenge answers it. */
export const deviceChallengeSchema = z.object({ nonce: z.string() });
/** Where a device stands, as POST /devices/status answers: waiting, approved, or not known (refused or removed). */
export const deviceStatusSchema = z.object({ status: z.enum(["pending", "authorized", "unknown"]) });
/** A login or sign-up from a device not authorized yet, answered 403 with its key's short code. */
export const devicePendingSchema = z.object({
  statusCode: z.literal(403),
  error: z.literal("device_pending"),
  message: z.string(),
  code: z.string(),
});
/** A device, as the server's computer lists it. */
export const deviceSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  name: z.string(),
  code: z.string(),
  status: z.enum(["pending", "authorized"]),
  createdAt: z.string(),
  approvedAt: z.string().nullable(),
  lastUsedAt: z.string().nullable(),
  current: z.boolean(),
});
/** The devices, as GET /devices answers. */
export const deviceListSchema = z.object({ devices: z.array(deviceSchema) });
/** The name the approver gives a device, when authorizing or renaming it; blank keeps "Dispositivo <code>". */
export const deviceNameSchema = z.object({ name: z.string().trim().max(DEVICE_NAME_MAX_LENGTH).optional() });

/** A device in the list. */
export type Device = z.infer<typeof deviceSchema>;
/** What a device sends to prove it holds its key. */
export type DeviceProof = z.infer<typeof deviceProofSchema>;
/** How an app reaches its device's key: its public key, and signing a nonce with the private one, which it never gives. */
export type DeviceSigner = {
  /** The public key, SPKI in base64url. */
  publicKey: () => Promise<string>;
  /** Signs a nonce, answering the signature in base64url. */
  sign: (nonce: string) => Promise<string>;
};
/** Where a device stands. */
export type DeviceStatus = z.infer<typeof deviceStatusSchema>["status"];

/**
 * Proves a device holds its key, for a nonce the server gave.
 * @param signer The device's key.
 * @param nonce The nonce.
 * @returns The proof to send.
 */
export async function proveDevice(signer: DeviceSigner, nonce: string): Promise<DeviceProof> {
  return { publicKey: await signer.publicKey(), nonce, signature: await signer.sign(nonce) };
}
