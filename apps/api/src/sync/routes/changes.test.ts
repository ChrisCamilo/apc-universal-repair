import assert from "node:assert/strict";
import { after, test } from "node:test";
import { SYNC_PAGE_SIZE_MAX } from "@apc/domain/sync";
import { buildApp } from "../../app.js";
import { AUTHORIZED, TEST_SESSIONS } from "../../auth/testSessions.js";

// These requests are answered before any database call, so they run without a database, from the stand-in session.

const app = buildApp({ sessions: TEST_SESSIONS });

after(() => app.close());

// Asks for the feed without a session and checks it is refused, as the inventory it sends is only for a logged-in
// device.
test("API: the change feed needs a session", async () => {
  const answer = await app.inject({ method: "GET", url: "/sync/changes" });
  assert.equal(answer.statusCode, 401);
});

// Asks for pages of no changes, of more than the most a page holds and of a limit that isn't a number, and checks
// each is refused, naming the limit.
test("API: the change feed checks the page's limit", async () => {
  for (const limit of ["0", String(SYNC_PAGE_SIZE_MAX + 1), "ten"]) {
    const answer = await app.inject({ headers: AUTHORIZED, method: "GET", url: `/sync/changes?limit=${limit}` });
    assert.equal(answer.statusCode, 400, limit);
    assert.equal(answer.json().details[0].field, "limit", limit);
  }
});
