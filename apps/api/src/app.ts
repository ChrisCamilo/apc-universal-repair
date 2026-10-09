import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "@fastify/type-provider-zod";
import { ITEM_PHOTO_LIMIT, PHOTO_MAX_BYTES } from "@apc/shared/photos";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerItemRoutes } from "./routes/items.js";
import { registerListRoutes } from "./routes/lists.js";
import { registerPhotoRoutes } from "./routes/photos.js";
import { registerUserRoutes } from "./routes/users.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Photo uploads: a file over 3 MB comes in cut short and marked truncated, so the photo route can say which one
  // it was; past twice the photo limit, the request is refused outright.
  app.register(multipart, {
    throwFileSizeLimit: false,
    limits: { fileSize: PHOTO_MAX_BYTES, parts: ITEM_PHOTO_LIMIT * 2 },
  });
  registerErrorHandler(app);
  registerHealthRoute(app);
  registerItemRoutes(app);
  registerListRoutes(app);
  registerPhotoRoutes(app);
  registerUserRoutes(app);

  return app;
}
