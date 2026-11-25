import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { SYNC_CHANGES_PATH, syncChangesQuerySchema, syncChangesSchema } from "@apc/domain/sync";
import { gone, refuse } from "../../http/replies.js";
import { readChanges } from "../changes.js";

// GET /sync/changes: a page of the server's changes after a cursor, for a phone's copy of the inventory (see
// @apc/domain/sync and ../changes.ts). A cursor the feed can't follow answers 410, and the phone makes its copy again.

/** What a cursor the feed can't follow is answered with. */
export const CURSOR_GONE = "The cursor is of another database or older than the deletions kept: make a full copy.";

export function registerChangeRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    SYNC_CHANGES_PATH,
    { schema: { querystring: syncChangesQuerySchema, response: { 200: syncChangesSchema } } },
    async (request, reply) => (await readChanges(request.query, request.session)) ?? refuse(reply, gone(CURSOR_GONE)),
  );
}
