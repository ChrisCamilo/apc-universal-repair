import { DEVICE_KEY_ALGORITHM, signNonce, toBase64url } from "@apc/shared/device-crypto";
import { proveDevice, type DeviceProof, type DeviceSigner } from "@apc/shared/devices";
import type { buildApp } from "../app.js";

// Devices for the tests, as a browser makes one: a key pair whose private key can't be exported, and the proof a login
// sends, with a nonce asked of the app. A login from inject's default address, 127.0.0.1, is the server's computer, so
// its device is authorized at once; one from another address waits.

/**
 * Makes a device's key pair.
 * @returns The device's key.
 */
export async function testDevice(): Promise<DeviceSigner> {
  const keys = await crypto.subtle.generateKey(DEVICE_KEY_ALGORITHM, false, ["sign", "verify"]);
  const publicKey = toBase64url(await crypto.subtle.exportKey("spki", keys.publicKey));
  return { publicKey: async () => publicKey, sign: (nonce) => signNonce(keys.privateKey, nonce) };
}

/**
 * Proves a device holds its key, with a nonce the app hands out.
 * @param app The app.
 * @param device The device's key.
 * @returns The proof a login, a sign-up or POST /devices/status sends.
 */
export async function testProof(app: ReturnType<typeof buildApp>, device: DeviceSigner): Promise<DeviceProof> {
  const { nonce } = (await app.inject({ method: "GET", url: "/devices/challenge" })).json() as { nonce: string };
  return proveDevice(device, nonce);
}
