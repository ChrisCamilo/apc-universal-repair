import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import Database from "better-sqlite3";
import pg from "pg";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { createPrisma } from "../client.js";
import { migrate, migrationNames, migrationsFolder } from "../tasks/migrate.js";
import type { DatabaseProvider } from "../provider.js";

// The migration that turns a catalog version's years into periods (20261118000000_catalog_year_periods), on new SQLite
// files and, when TEST_POSTGRES_URL names a PostgreSQL server whose user can create databases, on a new PostgreSQL
// database (`pnpm --filter @apc/api test:db`). Each database is migrated up to the migration before, which holds the
// sample catalog with its years and engines, given one more year of its own with an engine, then migrated on: every
// year is a period of that year alone, and every engine is still under its year, with its sheet. On SQLite, where the
// migration makes CatalogYear again inside a transaction, losing the engines to the cascade is the risk this guards.

/** The migration under test. */
const MIGRATION = "20261118000000_catalog_year_periods";
/** A folder for this run's SQLite files and the migrations before MIGRATION. */
const FOLDER = mkdtempSync(path.join(tmpdir(), "apc-catalog-periods-"));
/** The clients this run opens, closed at the end. */
const opened: PrismaClient[] = [];
/** A year of the user's own under the sample's Diplomata, and its engine. */
const OWN = { yearId: "00000000-0000-4000-8000-0000000000e1", engineId: "00000000-0000-4000-8000-0000000000e2", year: 1990 };
/** The sample's Diplomata version (see the catalog migration). */
const DIPLOMATA = "ca7a1000-0000-4000-8000-000000000008";

after(async () => {
  delete process.env.APC_MIGRATIONS_DIR;
  await Promise.all(opened.map((client) => client.$disconnect()));
  rmSync(FOLDER, { recursive: true, force: true });
});

/** A year and its engines as a database holds them: its id, its years and each engine's id and sheet. */
type Held = { id: string; year: number; lastYear?: number; engines: string[] }[];

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
 * Adds a year of the user's own with an engine, as a server from before held them.
 * @param run Runs one statement with its values, numbered $1, $2… on PostgreSQL and ?, ?… on SQLite.
 * @param mark The placeholder of the value at a 1-based place.
 */
async function writeOld(run: (sql: string, values: unknown[]) => Promise<unknown>, mark: (place: number) => string) {
  await run(`INSERT INTO "CatalogYear" ("id", "versionId", "position", "year") VALUES (${mark(1)}, ${mark(2)}, 9, ${mark(3)})`, [OWN.yearId, DIPLOMATA, OWN.year]);
  await run(
    `INSERT INTO "CatalogEngine" ("id", "yearId", "position", "displacementDl", "cylinders", "drive", "summary") VALUES (${mark(1)}, ${mark(2)}, 0, 41, 6, 'REAR', 'Seis em linha.')`,
    [OWN.engineId, OWN.yearId],
  );
}

/**
 * Reads the years and their engines as the database holds them, by id.
 * @param query Runs one query and answers its rows.
 * @param withLast Whether the years have their last year yet.
 * @returns Each year with its engines' ids and sheets, by the year's id.
 */
async function readHeld(query: (sql: string) => Promise<Record<string, unknown>[]>, withLast: boolean): Promise<Held> {
  const years = await query(`SELECT "id", "year"${withLast ? `, "lastYear"` : ""} FROM "CatalogYear" ORDER BY "id"`);
  const engines = await query(`SELECT "id", "yearId", "displacementDl", "cylinders", "drive", "summary" FROM "CatalogEngine" ORDER BY "id"`);
  return years.map((year) => ({
    id: String(year.id),
    year: Number(year.year),
    ...(withLast && { lastYear: Number(year.lastYear) }),
    engines: engines.filter((engine) => engine.yearId === year.id).map((engine) => `${engine.id} ${engine.displacementDl} ${engine.cylinders} ${engine.drive} ${engine.summary}`),
  }));
}

/**
 * Checks the migrated years and engines against the ones from before: the same years, each a period of that year alone,
 * with the same engines and sheets, and the user's own engine among them.
 * @param before The years and engines before the migration.
 * @param migrated The years and engines after it.
 */
function checkMigrated(before: Held, migrated: Held) {
  assert.deepEqual(
    migrated,
    before.map((year) => ({ ...year, lastYear: year.year })),
  );
  assert.ok(migrated.find((year) => year.id === OWN.yearId)!.engines[0].startsWith(OWN.engineId));
  assert.ok(migrated.flatMap((year) => year.engines).length >= 5);
}

/**
 * Reads this migration's SQL, to run it a second time.
 * @param provider The database.
 * @returns The statements.
 */
function readMigration(provider: DatabaseProvider): string {
  return readFileSync(path.join(migrationsFolder(provider), MIGRATION, "migration.sql"), "utf8");
}

// Migrates a new SQLite file up to the migration before, adds a year with an engine, and migrates on, checking every
// year is a period of that year alone and no engine was lost; then reads it through the API's client too.
test("API: on SQLite, every catalog year becomes a period of that year, its engines kept", async () => {
  const file = path.join(FOLDER, "old.db");
  const url = `file:${file}`;
  await migrateBefore(url, "sqlite");
  const db = new Database(file);
  await writeOld(async (sql, values) => db.prepare(sql).run(...values), () => "?");
  const before = await readHeld(async (sql) => db.prepare(sql).all() as Record<string, unknown>[], false);
  db.close();

  assert.equal((await migrate(url))[0], MIGRATION);
  const after = new Database(file);
  checkMigrated(before, await readHeld(async (sql) => after.prepare(sql).all() as Record<string, unknown>[], true));
  after.close();
  const client = createPrisma(url);
  opened.push(client);
  const own = await client.catalogYear.findUnique({ where: { id: OWN.yearId }, include: { engines: true } });
  assert.deepEqual([own?.year, own?.lastYear, own?.engines.map((engine) => engine.id)], [OWN.year, OWN.year, [OWN.engineId]]);
});

// The same on a new PostgreSQL database, where the migration only adds the column; skipped without TEST_POSTGRES_URL.
test("API: on PostgreSQL, every catalog year becomes a period of that year, its engines kept", { skip: !process.env.TEST_POSTGRES_URL }, async () => {
  const name = `apc_catalog_periods_${randomBytes(4).toString("hex")}`;
  const server = new pg.Client({ connectionString: process.env.TEST_POSTGRES_URL });
  await server.connect();
  await server.query(`CREATE DATABASE ${name}`);
  const url = new URL(process.env.TEST_POSTGRES_URL!);
  url.pathname = `/${name}`;
  try {
    await migrateBefore(url.toString(), "postgresql");
    const db = new pg.Client({ connectionString: url.toString() });
    await db.connect();
    await writeOld((sql, values) => db.query(sql, values), (place) => `$${place}`);
    const before = await readHeld(async (sql) => (await db.query(sql)).rows, false);

    assert.equal((await migrate(url.toString()))[0], MIGRATION);
    checkMigrated(before, await readHeld(async (sql) => (await db.query(sql)).rows, true));
    await db.end();
    assert.ok(readMigration("postgresql").includes(`SET NOT NULL`));
  } finally {
    await server.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await server.end();
  }
});
