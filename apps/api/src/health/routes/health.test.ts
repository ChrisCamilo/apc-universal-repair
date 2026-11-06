import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, test } from "node:test";
import { buildApp } from "../app.js";

// The health check answers without a database or a session.

const app = buildApp();

after(() => app.close());

// Asks GET /health and checks it answers ok with the version in apps/api/package.json.
test("API: the health check answers the API's version", async () => {
  const { version } = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string };
  const response = await app.inject({ method: "GET", url: "/health" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, "ok");
  assert.equal(response.json().version, version);
});
