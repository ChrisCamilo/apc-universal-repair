import multipart from "@fastify/multipart";
import Fastify, { type RouteOptions } from "fastify";
import { serializerCompiler, validatorCompiler } from "@fastify/type-provider-zod";
import { ITEM_PHOTO_LIMIT, PHOTO_MAX_BYTES } from "@apc/shared/photos";
import { registerAllowedHosts } from "./plugins/allowed-hosts.js";
import { registerAuthentication } from "./plugins/authenticate.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerItemRoutes } from "./routes/items.js";
import { registerListRoutes } from "./routes/lists.js";
import { registerPhotoRoutes } from "./routes/photos.js";
import { registerUserRoutes } from "./routes/users.js";
import { SESSIONS, type SessionLookup } from "./sessions/sessions.js";

/** The certificate and its private key the API answers HTTPS with, both PEM. */
export type HttpsOptions = { cert: string; key: string };

/**
 * Builds the API, answering only requests addressed to this computer (see registerAllowedHosts), with every route but
 * the public ones behind a session (see registerAuthentication).
 * @param options Where sessions are looked up: the database, or a stand-in, so a test can check routes without one;
 * what to tell of each route as it is registered, for a test that checks the API's routes; and the certificate to
 * answer HTTPS with, as the desktop app hands it while the phone's access is on, or none for plain HTTP.
 * @returns The Fastify app.
 */
export function buildApp({
  sessions = SESSIONS,
  onRoute,
  https,
}: { sessions?: SessionLookup; onRoute?: (route: RouteOptions) => void; https?: HttpsOptions } = {}) {
  const app = Fastify({ logger: true, https: https ?? null });
  if (onRoute) {
    app.addHook("onRoute", onRoute);
  }

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Photo uploads: a file over 3 MB comes in cut short and marked truncated, so the photo route can say which one
  // it was; past twice the photo limit, the request is refused outright.
  app.register(multipart, {
    throwFileSizeLimit: false,
    limits: { fileSize: PHOTO_MAX_BYTES, parts: ITEM_PHOTO_LIMIT * 2 },
  });
  registerErrorHandler(app);
  registerAllowedHosts(app);
  registerAuthentication(app, sessions);
  registerHealthRoute(app);
  registerItemRoutes(app);
  registerListRoutes(app);
  registerPhotoRoutes(app, sessions);
  registerUserRoutes(app);

  return app;
}
