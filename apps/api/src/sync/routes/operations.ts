import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { SYNC_OPERATIONS_PATH, syncOperationsResultSchema, syncOperationsSchema } from "@apc/domain/sync";
import { applyOperations } from "../operations.js";

// POST /sync/operations: applies a phone's batch of operations, in order, each once (see ../operations.ts), and answers
// each one's result. The device is the caller's session's.

export function registerOperationRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.post(
    SYNC_OPERATIONS_PATH,
    { schema: { body: syncOperationsSchema, response: { 200: syncOperationsResultSchema } } },
    async (request) => ({ results: await applyOperations(request.session.deviceId, request.body.operations) }),
  );
}
