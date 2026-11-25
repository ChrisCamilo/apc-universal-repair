import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import Database from "better-sqlite3";
import pg from "pg";
import { migrate, migrationNames, migrationsFolder } from "../tasks/migrate.js";
import type { DatabaseProvider } from "../provider.js";

// The migration that starts the change feed (20261123000000_change_feed), on a new SQLite file and, when
// TEST_POSTGRES_URL names a PostgreSQL server whose user can create databases, on a new PostgreSQL database
// (`pnpm --filter @apc/api test:db`). Each database is migrated up to the migration before, given an item, and migrated
// on: every row saved before has a version of its own, the item after its category, the feed's state holds the last
// one, and every synced table has the triggers that keep the feed, which a later migration redefining it could lose.

/** The migration under test. */
const MIGRATION = "20261123000000_change_feed";
/** A folder for this run's SQLite file and the migrations before MIGRATION. */
const FOLDER = mkdtempSync(path.join(tmpdir(), "apc-change-feed-"));
/** The tables whose rows the feed sends, each with triggers that stamp and keep their deletions. */
const SYNCED = [
  "Brand",
  "CatalogBrand",
  "CatalogEngine",
  "CatalogGeneration",
  "CatalogModel",
  "CatalogVersion",
  "CatalogYear",
  "Category",
  "Item",
  "ItemBrand",
  "ItemPhoto",
  "PartBrand",
  "VehicleModel",
];
/** The tables sent inside their item, whose changes give it a new version. */
const ITEM_PARTS = ["ItemOriginalCode", "ItemVehicle"];
/** The ids of the item saved before, and of its category and part brand. */
const IDS = {
  category: "00000000-0000-4000-8000-0000000000c1",
  partBrand: "00000000-0000-4000-8000-0000000000b1",
  item: "00000000-0000-4000-8000-000000000101",
  brand: "00000000-0000-4000-8000-000000000201",
};
/** When the rows were written, as a server from before held them. */
const WRITTEN = "2026-11-20T12:00:00.000Z";

after(() => {
  delete process.env.APC_MIGRATIONS_DIR;
  rmSync(FOLDER, { recursive: true, force: true });
});

/**
 * Migrates a database up to the migration before MIGRATION, from a copy of the migrations without it and the ones
 * after it.
 * @param url The database's DATABASE_URL.
 * @param provider Its database.
 */
async function migrateBefore(url: string, provider: DatabaseProvider) {
  const folder = path.join(FOLDER, `migrations-${randomBytes(3).toString("hex")}`);
  for (const name of migrationNames(provider).filter((each) => each < MIGRATION)) {
    cpSync(path.join(migrationsFolder(provider), name), path.join(folder, provider, name), { recursive: true });
  }
  process.env.APC_MIGRATIONS_DIR = folder;
  try {
    await migrate(url);
  } finally {
    delete process.env.APC_MIGRATIONS_DIR;
  }
}

/**
 * Adds an item with its category, part brand and brand, as a server from before saved them.
 * @param run Runs one statement with its values, numbered $1, $2… on PostgreSQL and ?, ?… on SQLite.
 * @param mark The placeholder of the value at a 1-based place.
 */
async function writeOld(run: (sql: string, values: unknown[]) => Promise<unknown>, mark: (place: number) => string) {
  await run(`INSERT INTO "Category" ("id", "name", "nameKey") VALUES (${mark(1)}, 'Faróis', 'farois')`, [IDS.category]);
  await run(`INSERT INTO "PartBrand" ("id", "name", "nameKey") VALUES (${mark(1)}, 'Arteb', 'arteb')`, [IDS.partBrand]);
  await run(
    `INSERT INTO "Item" ("id", "name", "nameKey", "categoryId", "position", "side", "quantity", "minQuantity", "createdAt", "updatedAt")
     VALUES (${mark(1)}, 'Farol', 'farol', ${mark(2)}, 'NA', 'NA', 1, 0, ${mark(3)}, ${mark(4)})`,
    [IDS.item, IDS.category, WRITTEN, WRITTEN],
  );
  await run(
    `INSERT INTO "ItemBrand" ("id", "itemId", "position", "partBrandId", "code", "codeKey", "color", "quantity", "unitPriceCents", "createdAt", "updatedAt")
     VALUES (${mark(1)}, ${mark(2)}, 0, ${mark(3)}, 'FD-1', 'FD1', 'N/A', 1, 100, ${mark(4)}, ${mark(5)})`,
    [IDS.brand, IDS.item, IDS.partBrand, WRITTEN, WRITTEN],
  );
}

/**
 * Checks what the migration left: a version for every synced row, each its own, the item's after its category's, the
 * state at the last one, and each table's triggers.
 * @param read Runs a query and answers its rows.
 * @param triggers The names of the database's triggers.
 * @param partEvents What names the triggers of an item's vehicles and original codes, after "<table>_sync_".
 */
async function checkMigrated(read: (sql: string) => Promise<Record<string, unknown>[]>, triggers: string[], partEvents: string[]) {
  const versions: number[] = [];
  for (const table of SYNCED) {
    versions.push(...(await read(`SELECT "syncVersion" AS v FROM "${table}"`)).map((row) => Number(row.v)));
  }
  assert.ok(versions.every((version) => version > 0), "every row has a version");
  assert.equal(new Set(versions).size, versions.length, "each version is a row's own");
  const [state] = await read(`SELECT "version" AS v FROM "SyncState" WHERE "id" = 1`);
  assert.equal(Number(state.v), Math.max(...versions));
  const [category] = await read(`SELECT "syncVersion" AS v FROM "Category" WHERE "id" = '${IDS.category}'`);
  const [item] = await read(`SELECT "syncVersion" AS v FROM "Item" WHERE "id" = '${IDS.item}'`);
  assert.ok(Number(item.v) > Number(category.v));
  const expected = [
    ...SYNCED.flatMap((table) => ["insert", "update", "delete"].map((event) => `${table}_sync_${event}`)),
    ...ITEM_PARTS.flatMap((table) => partEvents.map((event) => `${table}_sync_${event}`)),
  ];
  assert.deepEqual(expected.filter((name) => !triggers.includes(name)), []);
}

// Migrates a new SQLite file up to the migration before, adds an item, and migrates on, checking the versions given
// and the triggers.
test("API: on SQLite, the change feed's migration gives every row a version and keeps its triggers", async () => {
  const file = path.join(FOLDER, "old.db");
  const url = `file:${file}`;
  await migrateBefore(url, "sqlite");
  const db = new Database(file);
  await writeOld(async (sql, values) => db.prepare(sql).run(...values), () => "?");
  db.close();

  assert.equal((await migrate(url))[0], MIGRATION);
  const migrated = new Database(file);
  try {
    const triggers = migrated.prepare(`SELECT name FROM sqlite_master WHERE type = 'trigger'`).all() as { name: string }[];
    await checkMigrated(async (sql) => migrated.prepare(sql).all() as Record<string, unknown>[], triggers.map((row) => row.name), [
      "insert",
      "update",
      "move",
      "delete",
    ]);
  } finally {
    migrated.close();
  }
});

// The same on a new PostgreSQL database; skipped without TEST_POSTGRES_URL.
test("API: on PostgreSQL, the change feed's migration gives every row a version and keeps its triggers", { skip: !process.env.TEST_POSTGRES_URL }, async () => {
  const name = `apc_change_feed_${randomBytes(4).toString("hex")}`;
  const server = new pg.Client({ connectionString: process.env.TEST_POSTGRES_URL });
  await server.connect();
  await server.query(`CREATE DATABASE ${name}`);
  const url = new URL(process.env.TEST_POSTGRES_URL!);
  url.pathname = `/${name}`;
  try {
    await migrateBefore(url.toString(), "postgresql");
    const db = new pg.Client({ connectionString: url.toString() });
    await db.connect();
    try {
      await writeOld((sql, values) => db.query(sql, values), (place) => `$${place}`);
      assert.equal((await migrate(url.toString()))[0], MIGRATION);
      const triggers = await db.query<{ name: string }>(`SELECT DISTINCT trigger_name AS name FROM information_schema.triggers`);
      await checkMigrated(async (sql) => (await db.query(sql)).rows, triggers.rows.map((row) => row.name), ["item"]);
    } finally {
      await db.end();
    }
  } finally {
    await server.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await server.end();
  }
});
