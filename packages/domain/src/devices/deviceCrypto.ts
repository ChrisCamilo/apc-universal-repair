import { DEVICE_CODE_LENGTH, type DeviceProof } from "./devices.ts";

// How devices sign and how the server checks them (see devices.ts), through WebCrypto (crypto.subtle), as browsers, the
// desktop app and the API have it; the phone signs in native code (DeviceKeyModule.kt), with the same algorithm.

/** A device's key pair: ECDSA on P-256. */
export const DEVICE_KEY_ALGORITHM = { name: "ECDSA", namedCurve: "P-256" } as const;
/** How a nonce is signed: ECDSA with SHA-256, the signature as r and s, 32 bytes each (IEEE P1363). */
export const DEVICE_SIGNATURE_ALGORITHM = { name: "ECDSA", hash: "SHA-256" } as const;

/** RFC 4648's base32 alphabet, for the short code. */
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** A WebCrypto private key, as crypto.subtle.sign takes it. */
type SigningKey = Parameters<typeof crypto.subtle.sign>[1];

/**
 * Reads base64url into bytes.
 * @param text The base64url text, without padding.
 * @returns The bytes.
 */
export function fromBase64url(text: string): Uint8Array<ArrayBuffer> {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/**
 * Gives a key's short code, which the device and the server's computer show to compare.
 * @param publicKey The public key, SPKI in base64url.
 * @returns The first DEVICE_CODE_LENGTH characters of its SHA-256 in base32, e.g. "K7Q2ZD".
 */
export async function deviceCode(publicKey: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", fromBase64url(publicKey)));
  let bits = 0;
  let value = 0;
  let code = "";
  for (const byte of digest) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5 && code.length < DEVICE_CODE_LENGTH) {
      code += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return code;
}

/**
 * Signs a nonce with a WebCrypto private key, as browsers and the desktop app do.
 * @param privateKey The device's private key.
 * @param nonce The nonce.
 * @returns The signature, IEEE P1363, in base64url.
 */
export async function signNonce(privateKey: SigningKey, nonce: string): Promise<string> {
  return toBase64url(await crypto.subtle.sign(DEVICE_SIGNATURE_ALGORITHM, privateKey, new TextEncoder().encode(nonce)));
}

/**
 * Writes bytes as base64url.
 * @param bytes The bytes.
 * @returns base64url without padding.
 */
export function toBase64url(bytes: ArrayBuffer | Uint8Array): string {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(String.fromCharCode(...array)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Checks a device's signature of a nonce.
 * @param proof The public key, the nonce and the signature.
 * @returns True when the signature is the key's, of that nonce; false for any other, or a key that isn't P-256.
 */
export async function verifyDevice(proof: DeviceProof): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey("spki", fromBase64url(proof.publicKey), DEVICE_KEY_ALGORITHM, false, ["verify"]);
    return await crypto.subtle.verify(DEVICE_SIGNATURE_ALGORITHM, key, fromBase64url(proof.signature), new TextEncoder().encode(proof.nonce));
  } catch {
    return false;
  }
}
