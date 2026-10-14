import { randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { z } from "zod";
import { credentialsSchema, initials, sessionUserSchema, userCreateSchema, type SessionUser } from "@apc/shared/auth";
import { prisma } from "../db/client.js";
import { hashPassword, verifyPassword } from "../users/passwords.js";

// Sign-up and login. POST /users creates a user under the rules of the sign-up form (see @apc/shared/auth), with the
// password hashed and the e-mail only kept for now, and answers with the user as the session keeps them; a username
// in use, in any case, is refused with 409. POST /sessions checks a username and password and answers with the user,
// or 401 without saying which was wrong. An unknown username still goes through a hash, so the time taken doesn't
// tell whether it exists. Neither a password nor its hash is ever sent back. Both answers say whether the user has
// seen the Inventory tutorial, which PUT /users/:id/inventory-tutorial marks (204, or 404 for an unknown user; the
// first time is kept). Real sessions, with tokens the API checks, come with EP-10; until then the id is trusted, as
// the rest of the API trusts its callers.

/** The columns a user is answered with. */
const USER = { id: true, username: true, displayName: true, inventoryTutorialSeenAt: true } as const;
/** The user a path names. */
const userIdParamsSchema = z.object({ id: z.string().min(1) });
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
 * Answers 409 for a username another user has.
 * @param reply Reply to send.
 * @param username The username that clashes.
 * @returns The sent reply.
 */
function usernameTaken(reply: FastifyReply, username: string) {
  const message = `Username "${username}" is already taken.`;
  return reply.status(409).send({ statusCode: 409, error: "Conflict", message, details: [{ field: "username", message }] });
}

export function registerUserRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.post("/users", { schema: { body: userCreateSchema, response: { 201: sessionUserSchema } } }, async (request, reply) => {
    const { displayName, username, email, password } = request.body;
    if (await prisma.user.findUnique({ where: { username }, select: { id: true } })) {
      return usernameTaken(reply, username);
    }
    const user = await prisma.user.create({
      data: { displayName, username, email, passwordHash: await hashPassword(password) },
      select: USER,
    });
    return reply.status(201).send(sessionOf(user));
  });

  routes.post("/sessions", { schema: { body: credentialsSchema, response: { 200: sessionUserSchema } } }, async (request, reply) => {
    const { username, password } = request.body;
    const user = await prisma.user.findUnique({ where: { username }, select: { ...USER, passwordHash: true } });
    const matches = await verifyPassword(password, user?.passwordHash ?? (await UNKNOWN_USER_HASH));
    if (!user || !matches) {
      return loginRefused(reply);
    }
    return sessionOf(user);
  });

  routes.put("/users/:id/inventory-tutorial", { schema: { params: userIdParamsSchema } }, async (request, reply) => {
    const { id } = request.params;
    // Only the first time is kept.
    const { count } = await prisma.user.updateMany({
      where: { id, inventoryTutorialSeenAt: null },
      data: { inventoryTutorialSeenAt: new Date() },
    });
    if (count === 0 && !(await prisma.user.findUnique({ where: { id }, select: { id: true } }))) {
      return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "No user has this id." });
    }
    return reply.status(204).send();
  });
}
