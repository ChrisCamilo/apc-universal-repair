import assert from "node:assert/strict";
import { test } from "node:test";
import type { RouteOptions } from "fastify";
import { API_ROUTES } from "@apc/shared/api-routes";
import { buildApp } from "../app.js";
import { TEST_SESSIONS } from "../sessions/testSessions.js";

// The API's routes against @apc/shared/api-routes, the list the web app's demo answers too (see
// apps/web/src/demo/demoRoutes.test.ts): a route registered here and not there, or there and not here, or answering
// with another schema, fails, so the demo can't fall behind the API unnoticed. Fastify's own HEAD routes are left out.

/**
 * Names a route the way the failures list it.
 * @param route The route's method and path.
 * @returns E.g. "PATCH /items/:id".
 */
function named(route: { method: string; path: string }): string {
  return `${route.method} ${route.path}`;
}

/**
 * Builds the API and collects the routes it registers, without Fastify's HEAD routes.
 * @returns Each route as registered.
 */
async function registeredRoutes(): Promise<RouteOptions[]> {
  const registered: RouteOptions[] = [];
  const app = buildApp({ sessions: TEST_SESSIONS, onRoute: (route) => registered.push(route) });
  await app.ready();
  await app.close();
  return registered.filter((route) => route.method !== "HEAD");
}

// Builds the API, collecting each route it registers, and checks they are the routes of the shared list, naming any
// route only one side has.
test("API: the routes are the ones the shared list gives the web app's demo", async () => {
  const ours = (await registeredRoutes()).map((route) => named({ method: String(route.method), path: route.url }));
  const listed = API_ROUTES.map(named);
  assert.deepEqual(
    { missingFromList: ours.filter((route) => !listed.includes(route)), notInApi: listed.filter((route) => !ours.includes(route)) },
    { missingFromList: [], notInApi: [] },
  );
});

// Checks each route answers with the very schemas the shared list gives it, by status, so the demo's answers, parsed
// with those, have the API's fields.
test("API: each route answers with the schemas of the shared list", async () => {
  const registered = await registeredRoutes();
  for (const route of API_ROUTES) {
    const ours = registered.find((each) => each.method === route.method && each.url === route.path);
    const responses = (ours?.schema?.response ?? {}) as Record<string, unknown>;
    assert.deepEqual(Object.keys(responses), Object.keys(route.responses), `${named(route)}: statuses`);
    for (const [status, schema] of Object.entries(route.responses)) {
      assert.equal(responses[status], schema, `${named(route)}: the schema of ${status}`);
    }
  }
});
