import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { serverEnvironment, usesBundledServer } from "./bundledServer.ts";

// Builds the bundled server's environment and checks its data goes in userData's data folder, it applies the
// migrations it ships, and it answers on the port and the version given.
test("Desktop: the bundled server keeps its data in userData", () => {
  const userData = path.join("C:", "Users", "ana", "AppData", "Roaming", "APC Universal Repair");
  const serverDir = path.join("C:", "Program Files", "APC", "resources", "server");
  assert.deepEqual(serverEnvironment({ serverDir, userData, port: 3333, version: "0.3.1" }), {
    DATABASE_URL: `file:${path.join(userData, "data", "apc.db")}`,
    PHOTOS_DIR: path.join(userData, "data", "photos"),
    PORT: "3333",
    APC_MIGRATIONS_DIR: path.join(serverDir, "migrations"),
    APC_API_VERSION: "0.3.1",
    APC_MIGRATE_ON_START: "1",
  });
});

// Checks the app runs its own server only when nothing names another: an address or a clone's folder, from the
// environment or config.json, or the Vite dev server.
test("Desktop: the app runs its own server unless another is named", () => {
  assert.equal(usesBundledServer({}, {}), true);
  assert.equal(usesBundledServer({}, { database: "sqlite" }), true);
  assert.equal(usesBundledServer({ envApiUrl: "http://192.168.0.10:3333" }, {}), false);
  assert.equal(usesBundledServer({}, { apiUrl: "http://192.168.0.10:3333" }), false);
  assert.equal(usesBundledServer({ envApiDir: "C:/APC/apps/api" }, {}), false);
  assert.equal(usesBundledServer({}, { apiDir: "C:/APC/apps/api" }), false);
  assert.equal(usesBundledServer({ devUrl: "http://localhost:5173" }, {}), false);
});
