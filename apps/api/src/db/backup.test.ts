import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, afterEach, before, test } from "node:test";
import { backupBeforeMigrating, KEPT_BACKUPS } from "./backup.js";
import { setSqliteKey } from "./cipher.js";
import { createPrisma } from "./client.js";
import { checkDatabase, migrate, migrationsFolder } from "./migrate.js";

// The copy the server makes before applying new migrations, on encrypted SQLite files in a temporary folder: a
// version that ships a migration the file lacks, as an update does, is simulated with a copy of the migrations plus
// one more.

/** This run's folder, removed at the end. */
const FOLDER = mkdtempSync(path.join(tmpdir(), "apc-backup-"));
/** The SQLite files' key. */
const KEY = "4d".repeat(32);
/** The migrations of the next version: this one's, plus one. */
const NEXT = path.join(FOLDER, "next-migrations");

before(() => {
  cpSync(migrationsFolder("sqlite"), path.join(NEXT, "sqlite"), { recursive: true });
  mkdirSync(path.join(NEXT, "sqlite", "20991231000000_next"));
  writeFileSync(path.join(NEXT, "sqlite", "20991231000000_next", "migration.sql"), `CREATE TABLE "Next" ("id" TEXT);`);
});

after(() => rmSync(FOLDER, { recursive: true, force: true }));

afterEach(() => {
  delete process.env.APC_MIGRATIONS_DIR;
});

/**
 * Makes an encrypted file of this version, with two categories in it, in a folder of its own, and switches to the
 * next version's migrations, which it lacks one of.
 * @param name The file's folder.
 * @returns Its DATABASE_URL.
 */
async function fileBehind(name: string): Promise<string> {
  const url = `file:${path.join(FOLDER, name, "apc.db")}`;
  setSqliteKey(url, KEY);
  await migrate(url);
  const client = createPrisma(url);
  await client.$queryRawUnsafe("PRAGMA journal_mode = WAL");
  await client.category.create({ data: { name: "Motor", nameKey: "motor" } });
  await client.category.create({ data: { name: "Freios", nameKey: "freios" } });
  await client.$disconnect();
  process.env.APC_MIGRATIONS_DIR = NEXT;
  return url;
}

// Starts the next version on a file that lacks its migration, and checks the copy is made in backups/ beside it, named
// after the version, and opens with the file's key with every row; then the migration runs on the file.
test("API: the file is copied before new migrations run, and the copy opens with its key", async () => {
  const url = await fileBehind("behind");
  const result = await backupBeforeMigrating(url, "0.5.0", new Date("2026-10-17T01:02:03Z"));
  const copy = path.join(FOLDER, "behind", "backups", "apc-before-0.5.0-2026-10-17T01-02-03.db");
  assert.deepEqual(result, { made: copy });
  setSqliteKey(`file:${copy}`, KEY);
  const restored = createPrisma(`file:${copy}`);
  try {
    assert.deepEqual((await restored.category.findMany({ orderBy: { name: "asc" } })).map((category) => category.name), ["Freios", "Motor"]);
  } finally {
    await restored.$disconnect();
  }
  assert.deepEqual(await migrate(url), ["20991231000000_next"]);
});

// Checks a file with every migration applied, and one not made yet, are not copied.
test("API: no copy is made with nothing to migrate, or for a new file", async () => {
  const url = await fileBehind("current");
  delete process.env.APC_MIGRATIONS_DIR;
  assert.deepEqual(await backupBeforeMigrating(url, "0.5.0"), { skipped: "none-pending" });
  assert.equal(existsSync(path.join(FOLDER, "current", "backups")), false);
  assert.deepEqual(await backupBeforeMigrating(`file:${path.join(FOLDER, "new", "apc.db")}`, "0.5.0"), { skipped: "new-file" });
});

// Copies the same file once more than the copies kept, a day apart, and checks only the newest ones stay.
test("API: only the last copies are kept", async () => {
  const url = await fileBehind("pruned");
  for (let day = 1; day <= KEPT_BACKUPS + 1; day++) {
    await backupBeforeMigrating(url, `0.5.${day}`, new Date(`2026-10-0${day}T12:00:00Z`));
  }
  assert.deepEqual(readdirSync(path.join(FOLDER, "pruned", "backups")).sort(), [
    "apc-before-0.5.2-2026-10-02T12-00-00.db",
    "apc-before-0.5.3-2026-10-03T12-00-00.db",
    "apc-before-0.5.4-2026-10-04T12-00-00.db",
  ]);
});

// Puts a file where the backups folder goes, so the copy can't be made, and checks the copy fails and the migration is
// still pending: the server stops before migrating.
test("API: a copy that can't be made stops the migration", async () => {
  const url = await fileBehind("blocked");
  writeFileSync(path.join(FOLDER, "blocked", "backups"), "not a folder");
  await assert.rejects(backupBeforeMigrating(url, "0.5.0"));
  assert.deepEqual((await checkDatabase(url)).missing, ["20991231000000_next"]);
});
