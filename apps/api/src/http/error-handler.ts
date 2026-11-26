import type { FastifyError, FastifyInstance } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "@fastify/type-provider-zod";
import { badRequest, notFound, refuse } from "./replies.js";

// Every refusal carries a reason (see replies.ts): a request whose fields fail their schema, a route that isn't there,
// and what else Fastify refuses, or what failed on the server.

export function registerErrorHandler(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) => {
    refuse(reply, notFound("routeNotFound", `Route ${request.method}:${request.url} not found`));
  });
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const details = error.validation.map((issue) => ({
        field: issue.instancePath.replace(/^\//, "") || "unknown",
        message: issue.message ?? "Invalid value",
      }));
      refuse(reply, badRequest("invalid", "One or more fields failed validation.", details));
      return;
    }

    const statusCode = error.statusCode ?? 500;
    // The reply hides what went wrong; the log keeps it, to find the cause.
    if (statusCode === 500) {
      request.log.error(error);
    }
    reply.status(statusCode).send({
      statusCode,
      error: statusCode === 500 ? "Internal Server Error" : error.name,
      message: statusCode === 500 ? "Something went wrong. Please try again." : error.message,
      reason: statusCode === 500 ? "serverError" : "requestRefused",
    });
  });
}
