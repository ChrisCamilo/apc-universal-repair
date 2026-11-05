import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { DEVICE_KEY_ALGORITHM, deviceCode, signNonce, toBase64url, verifyDevice } from "./deviceCrypto.ts";
import { proveDevice, type DeviceSigner } from "./devices.ts";

/**
 * Makes a device's key pair, as a browser does.
 * @returns The signer, and its private key.
 */
async function makeDevice(): Promise<DeviceSigner> {
  const keys = await crypto.subtle.generateKey(DEVICE_KEY_ALGORITHM, false, ["sign", "verify"]);
  const publicKey = toBase64url(await crypto.subtle.exportKey("spki", keys.publicKey));
  return { publicKey: async () => publicKey, sign: (nonce) => signNonce(keys.privateKey, nonce) };
}

// Signs a nonce with a device's key and checks the signature holds for that key and nonce, and not for another nonce,
// another key, or a signature changed in one byte.
test("Shared: a device's signature of a nonce is checked against its key", async () => {
  const device = await makeDevice();
  const other = await makeDevice();
  const proof = await proveDevice(device, "n0nce-one");
  assert.equal(await verifyDevice(proof), true);
  assert.equal(await verifyDevice({ ...proof, nonce: "n0nce-two" }), false);
  assert.equal(await verifyDevice({ ...proof, publicKey: await other.publicKey() }), false);
  const flipped = proof.signature.startsWith("A") ? `B${proof.signature.slice(1)}` : `A${proof.signature.slice(1)}`;
  assert.equal(await verifyDevice({ ...proof, signature: flipped }), false);
  assert.equal(await verifyDevice({ ...proof, publicKey: "bm90LWEta2V5" }), false);
});

// Gives the short code of a key and checks it is the first six base32 characters of the key's SHA-256, the same each
// time, and another for another key.
test("Shared: a key's short code is the start of its SHA-256 in base32", async () => {
  const publicKey = await (await makeDevice()).publicKey();
  const code = await deviceCode(publicKey);
  assert.match(code, /^[A-Z2-7]{6}$/);
  const digest = createHash("sha256").update(Buffer.from(publicKey, "base64url")).digest();
  const bits = [...digest].map((byte) => byte.toString(2).padStart(8, "0")).join("");
  const expected = [0, 5, 10, 15, 20, 25].map((at) => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[parseInt(bits.slice(at, at + 5), 2)]).join("");
  assert.equal(code, expected);
  assert.equal(await deviceCode(publicKey), code);
  assert.notEqual(await deviceCode(await (await makeDevice()).publicKey()), code);
});
