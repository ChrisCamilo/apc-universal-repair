import assert from "node:assert/strict";
import type { RefusalReason } from "@apc/domain/refusals";

// What the tests check of a refusal: its status and its reason, the key the apps write their text from (see
// replies.ts), so a refusal that loses its reason, or changes it, fails the test that makes it.

/**
 * Checks a reply is a refusal with this status and this reason.
 * @param reply The reply, as inject() answers it.
 * @param statusCode The status it must have.
 * @param reason The reason it must carry.
 */
export function assertRefused(reply: { statusCode: number; json: () => unknown }, statusCode: number, reason: RefusalReason) {
  assert.deepEqual([reply.statusCode, (reply.json() as { reason?: string }).reason], [statusCode, reason]);
}
