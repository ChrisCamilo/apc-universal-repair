import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { databaseProvider, databaseUrl, DEFAULT_DATABASE_URL, sqliteFile } from "./provider.js";

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

// Reads the database with DATABASE_URL set, empty and missing, and checks the last two fall back to the SQLite file in
// apps/api/data, so a server set up for SQLite needs no DATABASE_URL.
test("API: without a DATABASE_URL the API keeps its data in a SQLite file", () => {
  const before = process.env.DATABASE_URL;
  try {
    process.env.DATABASE_URL = "postgresql://localhost/apc";
    assert.equal(databaseUrl(), "postgresql://localhost/apc");
    process.env.DATABASE_URL = "";
    assert.equal(databaseUrl(), DEFAULT_DATABASE_URL);
    delete process.env.DATABASE_URL;
    assert.equal(databaseUrl(), "file:./data/apc.db");
    assert.equal(databaseProvider(databaseUrl()), "sqlite");
  } finally {
    if (before === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = before;
    }
  }
});
