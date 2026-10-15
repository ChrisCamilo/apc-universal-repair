import type { FastifyInstance } from "fastify";
import { bearerToken, type ActiveSession, type SessionLookup } from "../sessions/sessions.js";

// Every route asks who is calling, before the body is read: a request without "Authorization: Bearer <token>", or
// with a token of no session or of an expired one, is answered 401, unknown paths included. A route opts out with
// config.public: GET /health, the login and the sign-up, and GET /photos/:file, which checks its signed path instead.
// The route then finds the caller's session in request.session.

declare module "fastify" {
  interface FastifyContextConfig {
    /** Whether the route answers without a session. */
    public?: boolean;
  }
  interface FastifyRequest {
    /** The caller's session; set on every route that isn't public. */
    session: ActiveSession;
  }
}

/**
 * Makes every route that isn't public need a session.
 * @param app The Fastify app, before its routes are registered.
 * @param sessions Where sessions are looked up.
 */
export function registerAuthentication(app: FastifyInstance, sessions: SessionLookup) {
  app.decorateRequest("session", null as unknown as ActiveSession);
  app.addHook("onRequest", async (request, reply) => {
    if (request.routeOptions.config.public) {
      return;
    }
    const token = bearerToken(request.headers.authorization);
    const session = token ? await sessions.byToken(token) : null;
    if (!session) {
      return reply.status(401).send({ statusCode: 401, error: "Unauthorized", message: "Log in to use the API." });
    }
    request.session = session;
  });
}
