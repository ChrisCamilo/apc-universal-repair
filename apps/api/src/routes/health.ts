import { readFileSync } from "node:fs";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { healthResponseSchema } from "@apc/shared";

// GET /health, open without a session: whether the API is up, and its version, which the desktop app compares with its
// own to warn about a server on another computer at another release (see apps/desktop/src/update.ts).

/**
 * The API's version: APC_API_VERSION, as the desktop app sets it for the server it ships, or apps/api/package.json's,
 * two folders up from src/routes, or dist/routes once built.
 */
export const API_VERSION =
  process.env.APC_API_VERSION ||
  (JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string }).version;

/**
 * Registers GET /health.
 * @param app The Fastify app.
 */
export function registerHealthRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/health",
    {
      config: { public: true },
      schema: {
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async () => ({
      status: "ok" as const,
      timestamp: new Date().toISOString(),
      version: API_VERSION,
    }),
  );
}
