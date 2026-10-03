import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "@fastify/type-provider-zod";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerItemRoutes } from "./routes/items.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  registerErrorHandler(app);
  registerHealthRoute(app);
  registerItemRoutes(app);

  return app;
}
