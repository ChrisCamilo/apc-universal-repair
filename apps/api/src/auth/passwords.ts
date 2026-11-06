import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Passwords are never kept as typed: each one is hashed with scrypt and a random salt of its own, and kept as
// "scrypt$<salt>$<hash>" in hex. A login hashes the password typed with the same salt and compares the two in
// constant time, so the time taken doesn't tell how much of it matched.

/** Length of a password's hash, in bytes. */
const KEY_BYTES = 64;
/** Length of a password's salt, in bytes. */
const SALT_BYTES = 16;
/** The scheme a kept hash starts with. */
const SCHEME = "scrypt";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keyLength: number) => Promise<Buffer>;

/**
 * Hashes a password with a new random salt.
 * @param password The password as typed.
 * @returns The hash to keep, e.g. "scrypt$1f…$9a…".
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scryptAsync(password, salt, KEY_BYTES);
  return [SCHEME, salt.toString("hex"), key.toString("hex")].join("$");
}

/**
 * Checks a password against a kept hash.
 * @param password The password as typed.
 * @param kept The hash hashPassword gave.
 * @returns Whether the password is the one hashed; false for a hash that isn't one.
 */
export async function verifyPassword(password: string, kept: string): Promise<boolean> {
  const [scheme, salt, key] = kept.split("$");
  if (scheme !== SCHEME || !salt || !key) {
    return false;
  }
  const expected = Buffer.from(key, "hex");
  const typed = await scryptAsync(password, Buffer.from(salt, "hex"), expected.length);
  return timingSafeEqual(typed, expected);
}
