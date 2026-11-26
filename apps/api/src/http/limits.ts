import type { FastifyReply, FastifyRequest } from "fastify";
import type { Limiter } from "../auth/attempts.js";
import { refuse, tooManyRequests } from "./replies.js";

// The routes that limit attempts (the login, the sign-up, the entry codes and the devices' challenges and statuses, see
// auth/attempts.ts) answer 429 the same way: with Retry-After in seconds, and a message saying how many minutes to wait,
// never why the attempt was counted.

/**
 * Counts each call of a route per address, answering 429 once the address reached its limit.
 * @param limiter The route's attempts, by address.
 * @returns The route's onRequest hook.
 */
export function limitByAddress(limiter: Limiter) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const wait = limiter.wait(request.ip);
    if (wait > 0) {
      return tooManyAttempts(reply, wait);
    }
    limiter.count(request.ip);
  };
}

/**
 * Answers 429 for attempts past a limit, saying when to try again.
 * @param reply Reply to send.
 * @param wait How long until the next attempt, in milliseconds.
 * @returns The sent reply.
 */
export function tooManyAttempts(reply: FastifyReply, wait: number) {
  const seconds = Math.ceil(wait / 1000);
  reply.header("retry-after", String(seconds));
  return refuse(reply, tooManyRequests("tooManyAttempts", `Too many attempts. Try again in ${Math.ceil(seconds / 60)} min.`));
}
