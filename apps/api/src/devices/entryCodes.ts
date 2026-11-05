import { randomInt } from "node:crypto";
import { ENTRY_CODE_MS } from "@apc/shared/auth";
import { ENTRY_CODE_ALPHABET, ENTRY_CODE_LENGTH } from "@apc/shared/pairing";

// The entry codes the server's computer hands out, which log a phone into the account open there (see
// @apc/shared/pairing): one per user at a time, a new one replacing theirs, each working once within ENTRY_CODE_MS.
// They live in memory, as the devices' nonces do: there is one server, and a restart only means showing another.

/** The codes handed out: whose account each logs into, and when it ends. */
const codes = new Map<string, { userId: string; endsAt: number }>();

/**
 * Hands out an entry code for a user, dropping the one they had and any that ended.
 * @param userId The user the code logs in.
 * @returns The code, ENTRY_CODE_LENGTH random characters of ENTRY_CODE_ALPHABET, and when it ends.
 */
export function issueEntryCode(userId: string): { code: string; expiresAt: Date } {
  codes.forEach((held, code) => (held.userId === userId || held.endsAt <= Date.now()) && codes.delete(code));
  const code = Array.from({ length: ENTRY_CODE_LENGTH }, () => ENTRY_CODE_ALPHABET[randomInt(ENTRY_CODE_ALPHABET.length)]).join("");
  const endsAt = Date.now() + ENTRY_CODE_MS;
  codes.set(code, { userId, endsAt });
  return { code, expiresAt: new Date(endsAt) };
}

/**
 * Uses an entry code up.
 * @param code The code the phone sent.
 * @returns The user it logs in, or null when it was never handed out, was used or ended.
 */
export function useEntryCode(code: string): string | null {
  const held = codes.get(code);
  codes.delete(code);
  return held && held.endsAt > Date.now() ? held.userId : null;
}
