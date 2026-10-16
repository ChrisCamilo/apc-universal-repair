import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { databaseProvider, sqliteFile } from "./provider.js";

/** The API's folder, apps/api. */
const API_DIR = fileURLToPath(new URL("../../", import.meta.url));

// Reads the database of a SQLite file, relative and absolute, and of PostgreSQL URLs, and checks each is told apart.
test("API: the database follows DATABASE_URL", () => {
  assert.equal(databaseProvider("file:./data/apc.db"), "sqlite");
  assert.equal(databaseProvider("file:C:/APC/apc.db"), "sqlite");
  assert.equal(databaseProvider("postgresql://postgres:x@localhost:5432/apc_universal_repair"), "postgresql");
  assert.equal(databaseProvider("postgres://localhost/apc"), "postgresql");
});

// Finds a SQLite file by a path relative to apps/api and by an absolute one.
test("API: a SQLite file's relative path is read from apps/api", () => {
  assert.equal(sqliteFile("file:./data/apc.db"), path.join(API_DIR, "data", "apc.db"));
  assert.equal(sqliteFile("file:data/apc.db"), path.join(API_DIR, "data", "apc.db"));
  const absolute = path.resolve("/apc/apc.db");
  assert.equal(sqliteFile(`file:${absolute}`), absolute);
});
