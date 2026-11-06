import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { deviceCode, verifyDevice } from "@apc/domain/device-crypto";
import { devicePublicKey, ensureDeviceKey, signNonce } from "./deviceKey.ts";
import type { Sealer } from "../server/database.ts";

// The desktop app's device key: made once, its private key sealed in config.json, signing nonces the API accepts.

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
  const folder = mkdtempSync(path.join(tmpdir(), "apc-desktop-device-"));
  folders.push(folder);
  return folder;
}

// Makes the key and checks it is kept sealed, never in plain text, and given back the same on the next start; and that
// its signature of a nonce is one the API's check accepts, for that key only.
test("Desktop: the device key is made once, sealed, and signs nonces the API accepts", async () => {
  const folder = userData();
  const key = ensureDeviceKey(folder, SEALER);
  const publicKey = devicePublicKey(key);
  assert.equal(readFileSync(path.join(folder, "config.json"), "utf8").includes("PRIVATE KEY"), false);
  assert.equal(devicePublicKey(ensureDeviceKey(folder, SEALER)), publicKey);
  assert.match(await deviceCode(publicKey), /^[A-Z2-7]{6}$/);

  const signature = signNonce(key, "n0nce");
  assert.equal(await verifyDevice({ publicKey, nonce: "n0nce", signature }), true);
  assert.equal(await verifyDevice({ publicKey, nonce: "other", signature }), false);
  const other = devicePublicKey(ensureDeviceKey(userData(), SEALER));
  assert.equal(await verifyDevice({ publicKey: other, nonce: "n0nce", signature }), false);
});

// Reads the sealed key as another Windows user, who can't open it, and checks a new key is made in its place.
test("Desktop: a device key that can't be opened is made again", () => {
  const folder = userData();
  const first = devicePublicKey(ensureDeviceKey(folder, SEALER));
  const refusing: Sealer = { ...SEALER, decryptString: () => assert.fail("Not this Windows user's.") };
  assert.notEqual(devicePublicKey(ensureDeviceKey(folder, refusing)), first);
});
