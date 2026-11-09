import assert from "node:assert/strict";
import { after, test } from "node:test";
import { buildApp } from "../../app.js";
import { TEST_SESSIONS } from "../../auth/testSessions.js";

// The catalog without a database: the request is refused before any database call when it has no session.

const app = buildApp({ sessions: TEST_SESSIONS });

after(() => app.close());

// Asks for the catalog with no token and checks it is refused, as every route but the public ones.
test("API: the catalog needs a session", async () => {
  const answer = await app.inject({ method: "GET", url: "/catalog" });
  assert.equal(answer.statusCode, 401);
});
