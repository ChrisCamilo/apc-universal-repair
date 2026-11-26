import assert from "node:assert/strict";
import { after, test } from "node:test";
import { SYNC_OPERATIONS_MAX } from "@apc/domain/sync";
import { buildApp } from "../../app.js";
import { AUTHORIZED, TEST_SESSIONS } from "../../auth/testSessions.js";
import { assertRefused } from "../../http/testReplies.js";

// These requests are answered before any database call, so they run without a database, from the stand-in session.

const app = buildApp({ sessions: TEST_SESSIONS });
/** An id for the operations and items these requests send. */
const ID = "00000000-0000-4000-8000-000000000001";

after(() => app.close());

/**
 * Sends a batch of operations from the stand-in session.
 * @param operations The operations, as sent.
 * @returns The answer.
 */
function send(operations: unknown) {
  return app.inject({ headers: AUTHORIZED, method: "POST", url: "/sync/operations", payload: { operations } });
}

// Sends a batch without a session and checks it is refused, as only a logged-in device changes the stock.
test("API: the phone's operations need a session", async () => {
  const answer = await app.inject({ method: "POST", url: "/sync/operations", payload: { operations: [] } });
  assertRefused(answer, 401, "loggedOut");
});

// Sends an empty batch, one over the most a batch holds, an operation of no known type and a stock move that moves
// nothing, and checks each is refused before anything is applied.
test("API: a batch of operations is checked before any is applied", async () => {
  const move = { id: ID, type: "moveStock", itemId: ID, brandId: ID, delta: 1 };
  for (const [name, operations] of [
    ["empty", []],
    ["too many", Array.from({ length: SYNC_OPERATIONS_MAX + 1 }, () => move)],
    ["unknown type", [{ ...move, type: "renameCategory" }]],
    ["no move", [{ ...move, delta: 0 }]],
  ] as const) {
    const answer = await send(operations);
    assert.equal(answer.statusCode, 400, name);
  }
});
