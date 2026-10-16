import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { buildApp } from "../app.js";
import { TEST_SESSIONS } from "../sessions/testSessions.js";
import { serverAnswers } from "./copy.js";

// The copy's check for a server that is on runs without a database: it only asks for the health check.

// Starts the API on a free port and checks it is seen as on, then stops it and checks it is seen as off, as the copy
// refuses to run while a server keeps writing to the source.
test("API: the copy sees whether a server answers", async () => {
  const app = buildApp({ sessions: TEST_SESSIONS });
  await app.listen({ port: 0, host: "127.0.0.1" });
  const url = `http://localhost:${(app.server.address() as AddressInfo).port}`;
  assert.equal(await serverAnswers(url), true);
  await app.close();
  assert.equal(await serverAnswers(url), false);
});
