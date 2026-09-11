import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { healthResponseSchema } from "@apc/shared";

export function registerHealthRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/health",
    {
      schema: {
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async () => ({
      status: "ok" as const,
      timestamp: new Date().toISOString(),
    }),
  );
}
