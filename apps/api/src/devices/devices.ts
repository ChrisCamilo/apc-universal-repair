import { randomBytes } from "node:crypto";
import { deviceCode, verifyDevice } from "@apc/shared/device-crypto";
import type { Device, DeviceProof } from "@apc/shared/devices";
import { prisma } from "../db/client.js";

// The devices users log in from (see @apc/shared/devices). A login or sign-up proves the device holds its key by
// signing a nonce from GET /devices/challenge, which lives CHALLENGE_MS and works once; the nonces live in memory, as
// there is one server, and a restart only means asking for another. A key the user hasn't logged in with is recorded
// as pending, unless it calls from the server's computer itself (the loopback address), which is authorized at once:
// the desktop app, the only one that calls from there, holds the database anyway. A login with an entry code from the
// server's computer (see entryCodes.ts) records its device the same way. The server's computer is also the only place
// devices are authorized, renamed and removed.

/** How long a nonce lives: 2 minutes, in milliseconds. */
const CHALLENGE_MS = 2 * 60 * 1000;
/** How many nonces are held before the ones that ended are dropped. */
const SWEEP_SIZE = 1000;

/** The nonces handed out, and when each ends. */
const challenges = new Map<string, number>();

/** A device row, with its user's names. */
type DeviceRow = {
  id: string;
  publicKey: string;
  status: "PENDING" | "AUTHORIZED";
  name: string;
  createdAt: Date;
  approvedAt: Date | null;
  lastUsedAt: Date | null;
  user: { username: string; displayName: string };
};

/**
 * Checks a device's proof: its nonce was handed out, hasn't been used and is still alive, which uses it up, and its
 * signature is the key's.
 * @param proof What the device sent.
 * @returns Whether it proves the device holds the key.
 */
export async function checkProof(proof: DeviceProof): Promise<boolean> {
  const endsAt = challenges.get(proof.nonce);
  challenges.delete(proof.nonce);
  return endsAt !== undefined && endsAt > Date.now() && (await verifyDevice(proof));
}

/**
 * Finds the device a user logs in from, recording an unknown key: authorized at once from the server's computer,
 * pending otherwise.
 * @param userId The user who logged in.
 * @param publicKey The device's public key.
 * @param local Whether the login comes from the server's computer itself.
 * @returns The device when it is authorized, or its short code while it waits.
 */
export async function deviceForLogin(userId: string, publicKey: string, local: boolean): Promise<{ id: string } | { pending: string }> {
  const now = new Date();
  const authorized = { status: "AUTHORIZED" as const, approvedAt: now };
  const device = await prisma.device.upsert({
    where: { userId_publicKey: { userId, publicKey } },
    create: { userId, publicKey, ...(local ? { ...authorized, name: "Este computador" } : {}) },
    update: {},
  });
  if (device.status === "AUTHORIZED") {
    return { id: device.id };
  }
  if (local) {
    await prisma.device.update({ where: { id: device.id }, data: { ...authorized, name: "Este computador" } });
    return { id: device.id };
  }
  return { pending: await deviceCode(publicKey) };
}

/**
 * Turns a device row into the device the server's computer lists.
 * @param row The device, with its user's names.
 * @param currentId The device of the caller's session, which can't remove itself by mistake.
 * @returns The device.
 */
export async function deviceOf(row: DeviceRow, currentId: string): Promise<Device> {
  return {
    id: row.id,
    username: row.user.username,
    displayName: row.user.displayName,
    name: row.name,
    code: await deviceCode(row.publicKey),
    status: row.status === "AUTHORIZED" ? "authorized" : "pending",
    createdAt: row.createdAt.toISOString(),
    approvedAt: row.approvedAt?.toISOString() ?? null,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    current: row.id === currentId,
  };
}

/**
 * Tells whether a request comes from the server's computer itself.
 * @param ip The request's address, e.g. "127.0.0.1", "::1" or "::ffff:127.0.0.1".
 * @returns True for a loopback address.
 */
export function isLoopback(ip: string): boolean {
  return ip === "::1" || /^(::ffff:)?127\./.test(ip);
}

/**
 * Hands out a nonce for a device to sign.
 * @returns The nonce, 24 random bytes in base64url.
 */
export function issueChallenge(): string {
  if (challenges.size >= SWEEP_SIZE) {
    challenges.forEach((endsAt, nonce) => endsAt <= Date.now() && challenges.delete(nonce));
  }
  const nonce = randomBytes(24).toString("base64url");
  challenges.set(nonce, Date.now() + CHALLENGE_MS);
  return nonce;
}
