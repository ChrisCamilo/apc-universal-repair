import assert from "node:assert/strict";
import { test } from "node:test";
import { fingerprintGroups, PAIRING_LINK, pairingLink, readPairing, readPairingLink } from "./pairing.ts";

/** A fingerprint as the desktop app writes it: a SHA-256 in base64url. */
const FINGERPRINT = "q1Wn7ZbX-0_aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV";
const SERVER = { url: "https://192.168.0.10:3000", fingerprint: FINGERPRINT };

// Builds the QR code's link and reads it back, and checks the address is escaped in it.
test("Shared: the pairing link carries the server's address and fingerprint", () => {
  const link = pairingLink(SERVER);
  assert.equal(link, `${PAIRING_LINK}?url=https%3A%2F%2F192.168.0.10%3A3000&fp=${FINGERPRINT}`);
  assert.deepEqual(readPairingLink(link), SERVER);
  assert.deepEqual(readPairingLink(`  ${link}\n`), SERVER);
});

// Reads links that aren't a pairing: another scheme, a missing or short fingerprint, an http:// address, an address
// with a path, a broken escape.
test("Shared: a malformed pairing link is refused", () => {
  for (const link of [
    "https://192.168.0.10:3000",
    `apc://other?url=https%3A%2F%2F192.168.0.10%3A3000&fp=${FINGERPRINT}`,
    `${PAIRING_LINK}?url=https%3A%2F%2F192.168.0.10%3A3000`,
    `${PAIRING_LINK}?url=https%3A%2F%2F192.168.0.10%3A3000&fp=${FINGERPRINT.slice(1)}`,
    `${PAIRING_LINK}?url=http%3A%2F%2F192.168.0.10%3A3000&fp=${FINGERPRINT}`,
    `${PAIRING_LINK}?url=https%3A%2F%2F192.168.0.10%3A3000%2Fapi&fp=${FINGERPRINT}`,
    `${PAIRING_LINK}?url=%E0%A4%A&fp=${FINGERPRINT}`,
  ]) {
    assert.equal(readPairingLink(link), null, link);
  }
});

// Reads an address and a code as typed in: with or without https://, a final slash, the fingerprint's spaces, a name
// for the computer, a bracketed IPv6; and refuses http://, a port out of range and a code with a character too many.
test("Shared: a typed address and code pair the same way as the link", () => {
  assert.deepEqual(readPairing("192.168.0.10:3000", fingerprintGroups(FINGERPRINT)), SERVER);
  assert.deepEqual(readPairing(" https://192.168.0.10:3000/ ", FINGERPRINT), SERVER);
  assert.deepEqual(readPairing("Oficina.local:3000", FINGERPRINT), { url: "https://oficina.local:3000", fingerprint: FINGERPRINT });
  assert.deepEqual(readPairing("[fe80::1]:3000", FINGERPRINT), { url: "https://[fe80::1]:3000", fingerprint: FINGERPRINT });
  assert.equal(readPairing("http://192.168.0.10:3000", FINGERPRINT), null);
  assert.equal(readPairing("192.168.0.10:70000", FINGERPRINT), null);
  assert.equal(readPairing("192.168.0.10:3000", `${FINGERPRINT}A`), null);
  assert.equal(fingerprintGroups(FINGERPRINT).split(" ").length, 11);
});
