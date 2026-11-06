import { randomInt } from "node:crypto";
import { ENTRY_CODE_MS } from "@apc/domain/auth";
import { ENTRY_CODE_ALPHABET, ENTRY_CODE_LENGTH } from "@apc/domain/pairing";

// The entry codes the server's computer hands out, which log a phone into the account open there (see
// @apc/domain/pairing): one free code per user at a time, a new one replacing theirs, each lasting ENTRY_CODE_MS. A
// phone the server's computer hasn't authorized yet holds the code it sent: from then on only that phone's key uses
// it, for up to HELD_MS, so it logs in once it is authorized, and a new code for the user leaves it be. A code is used
// up once it starts a session. They live in memory, as the devices' nonces do: there is one server, and a restart only
// means showing another.

/** How long a code held by a waiting phone lasts, from when it was held: 30 minutes, in milliseconds. */
export const HELD_MS = 30 * 60 * 1000;

/** The codes handed out: whose account each logs into, when it ends, and the key of the phone holding it, if any. */
const codes = new Map<string, { userId: string; endsAt: number; key?: string }>();

/**
 * Reads whose account an entry code logs a phone into.
 * @param code The code the phone sent.
 * @param key The phone's public key.
 * @returns The user, or null when the code was never handed out, ended, or is held by another phone.
 */
export function entryCodeUser(code: string, key: string): string | null {
  const held = codes.get(code);
  return held && held.endsAt > Date.now() && (!held.key || held.key === key) ? held.userId : null;
}

/**
 * Keeps an entry code for the phone that sent it while it waits for authorization: only its key uses it from then
 * on, for HELD_MS.
 * @param code The code.
 * @param key The phone's public key.
 */
export function holdEntryCode(code: string, key: string): void {
  const held = codes.get(code);
  if (held) {
    codes.set(code, { ...held, key, endsAt: Math.max(held.endsAt, Date.now() + HELD_MS) });
  }
}

/**
 * Hands out an entry code for a user, dropping their free one and any that ended; codes held by waiting phones stay.
 * @param userId The user the code logs in.
 * @returns The code, ENTRY_CODE_LENGTH random characters of ENTRY_CODE_ALPHABET, and when it ends.
 */
export function issueEntryCode(userId: string): { code: string; expiresAt: Date } {
  codes.forEach((held, code) => ((held.userId === userId && !held.key) || held.endsAt <= Date.now()) && codes.delete(code));
  const code = Array.from({ length: ENTRY_CODE_LENGTH }, () => ENTRY_CODE_ALPHABET[randomInt(ENTRY_CODE_ALPHABET.length)]).join("");
  const endsAt = Date.now() + ENTRY_CODE_MS;
  codes.set(code, { userId, endsAt });
  return { code, expiresAt: new Date(endsAt) };
}

/**
 * Uses an entry code up, once it started a session.
 * @param code The code.
 */
export function useEntryCode(code: string): void {
  codes.delete(code);
}
