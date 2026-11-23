import type { FastifyInstance, FastifyReply } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { SYNC_CHANGES_PATH, syncChangesQuerySchema, syncChangesSchema } from "@apc/domain/sync";
import { readChanges } from "../changes.js";

// GET /sync/changes: a page of the server's changes after a cursor, for a phone's copy of the inventory (see
// @apc/domain/sync and ../changes.ts). A cursor the feed can't follow answers 410, and the phone makes its copy again.

/** What a cursor the feed can't follow is answered with. */
export const CURSOR_GONE = "The cursor is of another database or older than the deletions kept: make a full copy.";

/**
 * Answers 410 for a cursor the feed can't follow.
 * @param reply Reply to send.
 * @returns The sent reply.
 */
function cursorGone(reply: FastifyReply) {
  return reply.status(410).send({ statusCode: 410, error: "Gone", message: CURSOR_GONE });
}

export function registerSyncRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    SYNC_CHANGES_PATH,
    { schema: { querystring: syncChangesQuerySchema, response: { 200: syncChangesSchema } } },
    async (request, reply) => (await readChanges(request.query, request.session)) ?? cursorGone(reply),
  );
}
