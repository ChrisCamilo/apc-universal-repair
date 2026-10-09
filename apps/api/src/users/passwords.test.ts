import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "./passwords.js";

// Hashes a password and checks the hash doesn't hold it, it matches only that password, case included, and hashing
// it again gives a different hash, each with its own salt.
test("API: a password is kept as a salted scrypt hash that only it matches", async () => {
  const kept = await hashPassword("opala4100");
  assert.match(kept, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.ok(!kept.includes("opala4100"));
  assert.equal(await verifyPassword("opala4100", kept), true);
  assert.equal(await verifyPassword("OPALA4100", kept), false);
  assert.equal(await verifyPassword("opala410", kept), false);
  assert.notEqual(await hashPassword("opala4100"), kept);
});

// Checks a hash that isn't one, empty or of another scheme, matches no password.
test("API: a malformed hash matches nothing", async () => {
  assert.equal(await verifyPassword("opala4100", ""), false);
  assert.equal(await verifyPassword("opala4100", "bcrypt$aa$bb"), false);
  assert.equal(await verifyPassword("opala4100", "scrypt$"), false);
});
