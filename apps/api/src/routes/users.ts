import { randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { credentialsSchema, initials, loggedInSchema, userCreateSchema, type SessionUser } from "@apc/shared/auth";
import { prisma } from "../db/client.js";
import { createSession, endSession } from "../sessions/sessions.js";
import { createLimiter, type Limiter } from "../users/attempts.js";
import { hashPassword, verifyPassword } from "../users/passwords.js";

// Sign-up, login and logout. POST /users creates a user under the rules of the sign-up form (see @apc/shared/auth), with
// the password hashed and the e-mail only kept for now; a username in use, in any case, is refused with 409. POST
// /sessions checks a username and password, or answers 401 without saying which was wrong. An unknown username still
// goes through a hash, so the time taken doesn't tell whether it exists. Both are open without a session and start
// one, answering with the user as the session keeps them and the session's token (see sessions.ts). Neither a
// password nor its hash is ever sent back. DELETE /sessions/current ends the caller's session (204). Both answers say
// whether the user has seen the Inventory tutorial, which PUT /users/me/inventory-tutorial marks for the caller (204;
// the first time is kept).
// Attempts are limited within 15-minute windows (see attempts.ts), answering 429 with Retry-After until the window
// ends, never saying whether the username exists: 5 wrong logins for one username from one address block it there,
// without checking the password, until a right one clears the count; and an address gets 30 logins and 10 sign-ups in
// all, valid or not. The desktop app and the web's dev server call from this computer, so they share its address.

/** How many wrong logins one username gets from one address in a window. */
const FAILED_LOGIN_LIMIT = 5;
/** How many logins an address gets in a window, whatever the username. */
const LOGIN_LIMIT = 30;
/** How many sign-ups an address gets in a window. */
const SIGN_UP_LIMIT = 10;
/** The columns a user is answered with. */
const USER = { id: true, username: true, displayName: true, inventoryTutorialSeenAt: true } as const;
/** A hash no password matches, checked when the username is unknown. */
const UNKNOWN_USER_HASH = hashPassword(randomBytes(32).toString("hex"));

/**
 * Answers 401 for a username and password that don't match, without saying which was wrong.
 * @param reply Reply to send.
 * @returns The sent reply.
 */
function loginRefused(reply: FastifyReply) {
  return reply.status(401).send({ statusCode: 401, error: "Unauthorized", message: "Wrong username or password." });
}

/**
 * Counts each call of a route per address, answering 429 once the address reached its limit.
 * @param limiter The route's attempts, by address.
 * @returns The route's onRequest hook.
 */
function limitByAddress(limiter: Limiter) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const wait = limiter.wait(request.ip);
    if (wait > 0) {
      return tooManyAttempts(reply, wait);
    }
    limiter.count(request.ip);
  };
}

/**
 * Turns a user row into the user the session keeps, with their initials and whether they have seen the tutorial.
 * @param user The user's columns.
 * @returns The session user.
 */
export function sessionOf({
  id,
  username,
  displayName,
  inventoryTutorialSeenAt,
}: {
  id: string;
  username: string;
  displayName: string;
  inventoryTutorialSeenAt: Date | null;
}): SessionUser {
  return { id, username, displayName, initials: initials(displayName), inventoryTutorialSeen: inventoryTutorialSeenAt !== null };
}

/**
 * Answers 429 for attempts past a limit, saying when to try again, and nothing about the username.
 * @param reply Reply to send.
 * @param wait How long until the next attempt, in milliseconds.
 * @returns The sent reply.
 */
function tooManyAttempts(reply: FastifyReply, wait: number) {
  const seconds = Math.ceil(wait / 1000);
  return reply
    .status(429)
    .header("retry-after", String(seconds))
    .send({ statusCode: 429, error: "Too Many Requests", message: `Too many attempts. Try again in ${Math.ceil(seconds / 60)} min.` });
}

/**
 * Answers 409 for a username another user has.
 * @param reply Reply to send.
 * @param username The username that clashes.
 * @returns The sent reply.
 */
function usernameTaken(reply: FastifyReply, username: string) {
  const message = `Username "${username}" is already taken.`;
  return reply.status(409).send({ statusCode: 409, error: "Conflict", message, details: [{ field: "username", message }] });
}

/**
 * Registers sign-up, login, logout and marking the tutorial seen, each app with its own counts of attempts.
 * @param app The Fastify app.
 */
export function registerUserRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();
  const failedLogins = createLimiter(FAILED_LOGIN_LIMIT);
  const logins = createLimiter(LOGIN_LIMIT);
  const signUps = createLimiter(SIGN_UP_LIMIT);

  routes.post(
    "/users",
    { config: { public: true }, onRequest: limitByAddress(signUps), schema: { body: userCreateSchema, response: { 201: loggedInSchema } } },
    async (request, reply) => {
      const { displayName, username, email, password } = request.body;
      if (await prisma.user.findUnique({ where: { username }, select: { id: true } })) {
        return usernameTaken(reply, username);
      }
      const user = await prisma.user.create({
        data: { displayName, username, email, passwordHash: await hashPassword(password) },
        select: USER,
      });
      return reply.status(201).send({ ...sessionOf(user), token: await createSession(user.id) });
    },
  );

  routes.post(
    "/sessions",
    { config: { public: true }, onRequest: limitByAddress(logins), schema: { body: credentialsSchema, response: { 200: loggedInSchema } } },
    async (request, reply) => {
      const { username, password } = request.body;
      const key = `${request.ip} ${username}`;
      const wait = failedLogins.wait(key);
      if (wait > 0) {
        return tooManyAttempts(reply, wait);
      }
      const user = await prisma.user.findUnique({ where: { username }, select: { ...USER, passwordHash: true } });
      const matches = await verifyPassword(password, user?.passwordHash ?? (await UNKNOWN_USER_HASH));
      if (!user || !matches) {
        failedLogins.count(key);
        return loginRefused(reply);
      }
      failedLogins.clear(key);
      return { ...sessionOf(user), token: await createSession(user.id) };
    },
  );

  routes.delete("/sessions/current", async (request, reply) => {
    await endSession(request.session.id);
    return reply.status(204).send();
  });

  routes.put("/users/me/inventory-tutorial", async (request, reply) => {
    // Only the first time is kept.
    await prisma.user.updateMany({
      where: { id: request.session.userId, inventoryTutorialSeenAt: null },
      data: { inventoryTutorialSeenAt: new Date() },
    });
    return reply.status(204).send();
  });
}
