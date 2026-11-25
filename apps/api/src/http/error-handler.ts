import type { FastifyError, FastifyInstance } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "@fastify/type-provider-zod";
import { badRequest, refuse } from "./replies.js";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const details = error.validation.map((issue) => ({
        field: issue.instancePath.replace(/^\//, "") || "unknown",
        message: issue.message ?? "Invalid value",
      }));
      refuse(reply, badRequest("One or more fields failed validation.", details));
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
    });
  });
}
