import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, afterEach, test } from "node:test";
import Database from "better-sqlite3";
import { migrate, migrationNames, migrationsFolder } from "./migrate.js";

// The migration runner on SQLite files in a temporary folder, so it runs without a database server; CI's migrations
// job runs it on PostgreSQL too (db:migrate, then db:check).

/** This run's folder, removed at the end. */
const FOLDER = mkdtempSync(path.join(tmpdir(), "apc-migrate-"));

after(() => rmSync(FOLDER, { recursive: true, force: true }));

afterEach(() => {
  delete process.env.APC_MIGRATIONS_DIR;
});

/**
 * Reads what a SQLite file records in _prisma_migrations.
 * @param file The file.
 * @returns Each migration's name, checksum and whether it finished, in the order applied.
 */
function recorded(file: string): { migration_name: string; checksum: string; finished: number }[] {
  const db = new Database(file, { readonly: true });
  try {
    return db
      .prepare(`SELECT migration_name, checksum, finished_at IS NOT NULL AS finished FROM "_prisma_migrations" ORDER BY started_at`)
      .all() as never;
  } finally {
    db.close();
  }
}

/**
 * Lists a SQLite file's tables.
 * @param file The file.
 * @returns The tables' names, sorted.
 */
function tables(file: string): string[] {
  const db = new Database(file, { readonly: true });
  try {
    return (db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`).all() as { name: string }[]).map((row) => row.name);
  } finally {
    db.close();
  }
}

// Migrates a new file, in a folder that doesn't exist yet, and checks every migration is applied once, recorded as
// Prisma records it, with the SHA-256 of the file, and that running it again applies nothing.
test("API: the runner applies each pending migration once and records it as Prisma does", async () => {
  const file = path.join(FOLDER, "new", "apc.db");
  const applied: string[] = [];
  assert.deepEqual(await migrate(`file:${file}`, (name) => applied.push(name)), migrationNames("sqlite"));
  assert.deepEqual(applied, migrationNames("sqlite"));
  assert.deepEqual(
    recorded(file),
    migrationNames("sqlite").map((name) => ({
      migration_name: name,
      checksum: createHash("sha256").update(readFileSync(path.join(migrationsFolder("sqlite"), name, "migration.sql"))).digest("hex"),
      finished: 1,
    })),
  );
  assert.ok(tables(file).includes("Item") && tables(file).includes("Session"));
  assert.deepEqual(await migrate(`file:${file}`), []);
});

// Adds a migration that fails and one after it to a copy of the migrations, and checks the run stops at the failing
// one, naming it, with neither of them recorded nor the later one's table made, the earlier ones kept.
test("API: a failing migration stops the run and leaves itself and the next unapplied", async () => {
  const shipped = path.join(FOLDER, "shipped");
  cpSync(migrationsFolder("sqlite"), path.join(shipped, "sqlite"), { recursive: true });
  for (const [name, sql] of [
    ["20991231000000_broken", `CREATE TABLE "Half" ("id" TEXT);\nINSERT INTO "Missing" VALUES (1);`],
    ["20991231000001_after", `CREATE TABLE "After" ("id" TEXT);`],
  ]) {
    mkdirSync(path.join(shipped, "sqlite", name), { recursive: true });
    writeFileSync(path.join(shipped, "sqlite", name, "migration.sql"), sql);
  }
  process.env.APC_MIGRATIONS_DIR = shipped;
  const file = path.join(FOLDER, "broken.db");
  await assert.rejects(migrate(`file:${file}`), /The migration 20991231000000_broken failed/);
  assert.deepEqual(
    recorded(file).map((row) => row.migration_name),
    migrationNames("sqlite").filter((name) => !name.startsWith("2099")),
  );
  assert.equal(tables(file).includes("Half"), false);
  assert.equal(tables(file).includes("After"), false);
});

// Records a migration as started and never finished, as a run cut short by Prisma would, and checks the runner refuses
// to go on, naming it.
test("API: a migration left unfinished stops the runner", async () => {
  const file = path.join(FOLDER, "unfinished.db");
  await migrate(`file:${file}`);
  const db = new Database(file);
  db.prepare(`INSERT INTO "_prisma_migrations" (id, checksum, migration_name) VALUES ('x', 'y', '20991231000000_cut')`).run();
  db.close();
  await assert.rejects(migrate(`file:${file}`), /20991231000000_cut started before and didn't finish/);
});
