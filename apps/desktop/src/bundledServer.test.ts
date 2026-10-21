import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { DEV_SERVER_PORT, SERVER_PORT as SHARED_SERVER_PORT } from "@apc/shared/server";
import { SERVER_PORT, serverEnvironment, usesBundledServer } from "./bundledServer.ts";
import { DEFAULT_API_URL } from "./config.ts";

// Builds the bundled server's environment and checks its data goes in userData's data folder, it applies the
// migrations it ships, and it answers on the port and the version given; the SQLite file gets its key, and on PostgreSQL
// only the photos stay there, with no key.
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
  const address = "postgresql://postgres:secret@localhost:5432/apc";
  const key = "1f".repeat(32);
  const onPostgresql = serverEnvironment({ serverDir, userData, port: 3333, version: "0.3.1", databaseUrl: address, sqliteKey: key });
  assert.equal(onPostgresql.DATABASE_URL, address);
  assert.equal(onPostgresql.PHOTOS_DIR, path.join(userData, "data", "photos"));
  assert.equal(onPostgresql.APC_SQLITE_KEY, undefined);
  assert.equal(serverEnvironment({ serverDir, userData, port: 3333, version: "0.3.1", sqliteKey: key }).APC_SQLITE_KEY, key);
});

// Checks the bundled server's port and the development API's address are the ports of @apc/shared/server, which the
// packaged app can't import, so the server the app ships and a development API never share a port.
test("Desktop: the server's port and the development API's match the shared ports", () => {
  assert.equal(SERVER_PORT, SHARED_SERVER_PORT);
  assert.equal(new URL(DEFAULT_API_URL).port, String(DEV_SERVER_PORT));
});

// Checks the app runs its own server only when nothing names another: an address, from the environment or
// config.json, or the Vite dev server.
test("Desktop: the app runs its own server unless another is named", () => {
  assert.equal(usesBundledServer({}, {}), true);
  assert.equal(usesBundledServer({}, { database: "sqlite" }), true);
  assert.equal(usesBundledServer({ envApiUrl: "http://192.168.0.10:3333" }, {}), false);
  assert.equal(usesBundledServer({}, { apiUrl: "http://192.168.0.10:3333" }), false);
  assert.equal(usesBundledServer({ devUrl: "http://localhost:5173" }, {}), false);
});
