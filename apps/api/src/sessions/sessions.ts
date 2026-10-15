import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "../db/client.js";

// Sessions: a login or sign-up starts one, with a random token the device sends on every request as
// "Authorization: Bearer <token>". Only the token's SHA-256 hash is kept, so the Session table alone can't be used to
// log in. A session lasts 30 days from its last use, which a request writes once an hour at most, so it isn't a write
// per request; an expired one is deleted when it is next looked up, and logging out deletes it at once.
// Photos are loaded by <img> and <Image>, which can't send a header, so each photo path the API answers is signed for
// the caller's session: "?session=<id>&signature=<HMAC-SHA256 of the file name, keyed by the token's hash>". Only the
// API can sign it, and it stops working when the session ends.

/** How long a session lasts from its last use: 30 days, in milliseconds. */
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
/** The sessions in the database. */
export const SESSIONS: SessionLookup = {
  byId: async (id) => alive(await prisma.session.findUnique({ where: { id } })),
  byToken: async (token) => alive(await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } })),
};
/** Length of a token, in bytes before base64url. */
const TOKEN_BYTES = 32;
/** How long a session's last use may be behind before a request writes it again: an hour, in milliseconds. */
const TOUCH_MS = 60 * 60 * 1000;

/** A session that hasn't expired: whose it is, and the hash its photo paths are signed with. */
export type ActiveSession = { id: string; userId: string; tokenHash: string };
/** How the API finds a caller's session: by the token a request sends, or by the id a signed photo path names. */
export type SessionLookup = {
  byId: (id: string) => Promise<ActiveSession | null>;
  byToken: (token: string) => Promise<ActiveSession | null>;
};

/**
 * Checks a session row hasn't expired, deleting it when it has, and writes its last use when it is an hour behind.
 * @param row The row found, or null.
 * @returns The session, or null when there is none or it expired.
 */
async function alive(
  row: { id: string; userId: string; tokenHash: string; lastUsedAt: Date; expiresAt: Date } | null,
): Promise<ActiveSession | null> {
  if (!row) {
    return null;
  }
  const now = new Date();
  if (row.expiresAt <= now) {
    await prisma.session.deleteMany({ where: { id: row.id } });
    return null;
  }
  if (now.getTime() - row.lastUsedAt.getTime() >= TOUCH_MS) {
    await prisma.session.update({ where: { id: row.id }, data: { lastUsedAt: now, expiresAt: new Date(now.getTime() + SESSION_MS) } });
  }
  return { id: row.id, userId: row.userId, tokenHash: row.tokenHash };
}

/**
 * Reads the token of an Authorization header.
 * @param header The header, e.g. "Bearer 3q2-7w…".
 * @returns The token, or undefined when the header is missing or isn't a bearer token.
 */
export function bearerToken(header: string | undefined): string | undefined {
  const match = header?.match(/^Bearer ([A-Za-z0-9_-]+)$/);
  return match?.[1];
}

/**
 * Starts a session for a user who just logged in or signed up, deleting their expired ones.
 * @param userId The user.
 * @returns The token to hand the device, which is never kept.
 */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const now = new Date();
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId, expiresAt: { lte: now } } }),
    prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + SESSION_MS) } }),
  ]);
  return token;
}

/**
 * Ends a session, as logging out does: its token and signed photo paths stop working.
 * @param id The session.
 */
export async function endSession(id: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id } });
}

/**
 * Hashes a token the way the Session table keeps it.
 * @param token The token a device sends.
 * @returns Its SHA-256, in hex.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Signs a photo file for a session.
 * @param session The session the path is for.
 * @param file The stored file's name, e.g. "1f…-thumb.webp".
 * @returns The signature, in base64url.
 */
function photoSignature(session: ActiveSession, file: string): string {
  return createHmac("sha256", session.tokenHash).update(file).digest("base64url");
}

/**
 * Gives the path a photo file is served at for a session.
 * @param session The caller's session.
 * @param file The stored file's name.
 * @returns The path, e.g. "/photos/1f….webp?session=…&signature=…".
 */
export function signedPhotoPath(session: ActiveSession, file: string): string {
  return `/photos/${file}?${new URLSearchParams({ session: session.id, signature: photoSignature(session, file) })}`;
}

/**
 * Checks a photo path's signature, in constant time.
 * @param session The session the path names.
 * @param file The file asked for.
 * @param signature The signature the path carries.
 * @returns Whether the API signed this file for this session.
 */
export function validPhotoSignature(session: ActiveSession, file: string, signature: string): boolean {
  const expected = Buffer.from(photoSignature(session, file));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
