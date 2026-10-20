import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { modelDifferences } from "./schemas.js";

/** The PostgreSQL schema. */
const POSTGRESQL = readFileSync(new URL("../../prisma/schema.prisma", import.meta.url), "utf8");
/** The SQLite schema. */
const SQLITE = readFileSync(new URL("../../prisma/sqlite/schema.prisma", import.meta.url), "utf8");

// Compares the two schemas in the repo and checks they hold the same models, their setup blocks aside.
test("API: the PostgreSQL and SQLite schemas hold the same models", () => {
  assert.deepEqual(modelDifferences(POSTGRESQL, SQLITE), []);
});

// Adds a field to the SQLite schema only, and removes one from it, and checks each is named as a difference.
test("API: a field in only one schema is a difference", () => {
  const added = SQLITE.replace("  location       String?", "  location       String?\n  shelf          String?");
  assert.deepEqual(modelDifferences(POSTGRESQL, added), ['Only in SQLite: "shelf String?"']);
  const removed = SQLITE.replace(/ {2}location +String\?\r?\n/, "");
  assert.deepEqual(modelDifferences(POSTGRESQL, removed), ['Only in PostgreSQL: "location String?"']);
});

// Gives the PostgreSQL schema a native type and realigns a column, as `prisma format` would, and checks neither is a
// difference, as the databases may differ there.
test("API: native types and spacing aren't differences", () => {
  const native = POSTGRESQL.replace("  color          String      @default(\"N/A\")", "  color String @default(\"N/A\") @db.VarChar(32)");
  assert.notEqual(native, POSTGRESQL);
  assert.deepEqual(modelDifferences(native, SQLITE), []);
});
