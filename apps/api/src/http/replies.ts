import type { FastifyReply } from "fastify";
import type { RefusalReason } from "@apc/domain/refusals";

// How the API refuses a request: a status with { statusCode, error, message, reason }, and details naming the fields or
// the entries at fault when there are any. The reason is a stable key the apps write their text from, in the language
// chosen (see @apc/domain/refusals); the message stays in English, for logs and developers. A route or a rule builds
// the refusal here, as data, and the route answers it with refuse(), so every refusal has the same shape. A rule can
// refuse without knowing Fastify, as the item changes do for the item routes and a phone's batch of operations alike
// (see inventory/itemChanges.ts): it gives a Result, its value (done) or its refusal (refused), which the route answers
// with answer().

/** The name each status the API refuses with is sent with. */
const ERRORS = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  410: "Gone",
  429: "Too Many Requests",
} as const;

/** Why a request was refused: its status and the body it is answered with. */
export type Rejection = {
  statusCode: number;
  error: string;
  message: string;
  /** Why, as a key the apps write their text from. */
  reason: RefusalReason;
  /** The fields or entries at fault, each with its message. */
  details?: Record<string, unknown>[];
  /** The short code of a device waiting for authorization. */
  code?: string;
};
/** What a rule gave: its value, or why it refused. */
export type Result<Value> = { ok: true; value: Value } | { ok: false; rejection: Rejection };

/**
 * Answers what a rule gave: its value with the status, or its refusal.
 * @param reply Reply to send.
 * @param result What the rule gave.
 * @param statusCode The status of a value, 200 unless something was created (201).
 * @returns The sent reply.
 */
export function answer<Value>(reply: FastifyReply, result: Result<Value>, statusCode = 200) {
  return result.ok ? reply.status(statusCode).send(result.value) : refuse(reply, result.rejection);
}

/**
 * Refuses a request the API can't take as it is sent.
 * @param reason Why, as a key.
 * @param message What is wrong.
 * @param details The fields at fault, if any.
 * @returns The refusal.
 */
export function badRequest(reason: RefusalReason, message: string, details?: Record<string, unknown>[]): Rejection {
  return rejection(400, reason, message, details);
}

/**
 * Refuses a change that clashes with what the database holds.
 * @param reason Why, as a key.
 * @param message What clashes.
 * @param details The fields or entries at fault, if any.
 * @returns The refusal.
 */
export function conflict(reason: RefusalReason, message: string, details?: Record<string, unknown>[]): Rejection {
  return rejection(409, reason, message, details);
}

/**
 * Gives a rule's value.
 * @param value The value.
 * @returns The result.
 */
export function done<Value>(value: Value): { ok: true; value: Value } {
  return { ok: true, value };
}

/**
 * Refuses a request from where it isn't allowed.
 * @param reason Why, as a key.
 * @param message Why.
 * @returns The refusal.
 */
export function forbidden(reason: RefusalReason, message: string): Rejection {
  return rejection(403, reason, message);
}

/**
 * Refuses a request for something the API no longer keeps.
 * @param reason Why, as a key.
 * @param message What is gone, and what to do instead.
 * @returns The refusal.
 */
export function gone(reason: RefusalReason, message: string): Rejection {
  return rejection(410, reason, message);
}

/**
 * Refuses a request for something that isn't there.
 * @param reason Why, as a key.
 * @param message What isn't there.
 * @returns The refusal.
 */
export function notFound(reason: RefusalReason, message: string): Rejection {
  return rejection(404, reason, message);
}

/**
 * Answers a refused request with its status and body.
 * @param reply Reply to send.
 * @param refusal Why the request was refused.
 * @returns The sent reply.
 */
export function refuse(reply: FastifyReply, refusal: Rejection) {
  return reply.status(refusal.statusCode).send(refusal);
}

/**
 * Gives a rule's refusal.
 * @param rejection Why.
 * @returns The result.
 */
export function refused(rejection: Rejection): { ok: false; rejection: Rejection } {
  return { ok: false, rejection };
}

/**
 * Builds a refusal.
 * @param statusCode Its status.
 * @param reason Why, as a key.
 * @param message Why.
 * @param details The fields or entries at fault, if any.
 * @returns The refusal.
 */
function rejection(statusCode: keyof typeof ERRORS, reason: RefusalReason, message: string, details?: Record<string, unknown>[]): Rejection {
  return { statusCode, error: ERRORS[statusCode], message, reason, ...(details && { details }) };
}

/**
 * Refuses a request past a limit of attempts.
 * @param reason Why, as a key.
 * @param message Why, and when to try again.
 * @returns The refusal.
 */
export function tooManyRequests(reason: RefusalReason, message: string): Rejection {
  return rejection(429, reason, message);
}

/**
 * Refuses a request without a session, or with a credential that doesn't hold.
 * @param reason Why, as a key.
 * @param message What to do.
 * @returns The refusal.
 */
export function unauthorized(reason: RefusalReason, message: string): Rejection {
  return rejection(401, reason, message);
}
