import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import Database from "better-sqlite3";
import pg from "pg";
import { brandMark, catalogIdParamsSchema } from "@apc/domain/catalog";
import { optionKey } from "@apc/domain/items";
import { TEST_CATALOG_DATA } from "@apc/domain/test-catalog";
import { STARTING_VEHICLE_BRANDS } from "@apc/domain/vehicle-lists";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createPrisma } from "./client.js";
import { migrate, migrationNames, migrationsFolder } from "./migrate.js";
import type { DatabaseProvider } from "./provider.js";

// The migration that puts the starting vehicle brands and models in the Catalog (20261113000000_catalog_starting_brands),
// on new SQLite files and, when TEST_POSTGRES_URL names a PostgreSQL server whose user can create databases, on a new
// PostgreSQL database (`pnpm --filter @apc/api test:db`). Each database is migrated up to the migration before, which
// holds the sample catalog and the starting lists, and given a catalog brand of the user's own after the sample's and a
// listed model deleted from the lists, then migrated on: the sample brands and the user's keep their places and trees,
// the other listed brands follow in the list's order with their letters, each brand's listed models come after the ones
// it has, the deleted model isn't brought back, and running the migration again changes nothing.

/** The migration under test. */
const MIGRATION = "20261113000000_catalog_starting_brands";
/** A folder for this run's SQLite files and the migrations before MIGRATION. */
const FOLDER = mkdtempSync(path.join(tmpdir(), "apc-catalog-brands-"));
/** The clients this run opens, closed at the end. */
const opened: PrismaClient[] = [];
/** The user's own catalog brand, after the sample's. */
const ENVEMO = { id: "00000000-0000-4000-8000-000000000001", name: "Envemo", nameKey: "envemo" };
/** A listed model the user deleted from the lists before the migration. */
const DELETED = { brand: "Fiat", model: "Marea" };

after(async () => {
  delete process.env.APC_MIGRATIONS_DIR;
  await Promise.all(opened.map((client) => client.$disconnect()));
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
 * Adds the user's catalog brand and deletes the listed model, as a server from before held them.
 * @param run Runs one statement with its values, numbered $1, $2… on PostgreSQL and ?, ?… on SQLite.
 * @param mark The placeholder of the value at a 1-based place.
 */
async function writeOld(run: (sql: string, values: unknown[]) => Promise<unknown>, mark: (place: number) => string) {
  await run(`INSERT INTO "Brand" ("id", "name", "nameKey") VALUES (${mark(1)}, ${mark(2)}, ${mark(3)})`, [ENVEMO.id, ENVEMO.name, ENVEMO.nameKey]);
  await run(`INSERT INTO "CatalogBrand" ("id", "brandId", "mark", "position") VALUES (${mark(1)}, ${mark(2)}, 'EN', 4)`, [
    "00000000-0000-4000-8000-000000000002",
    ENVEMO.id,
  ]);
  await run(
    `DELETE FROM "VehicleModel" WHERE "nameKey" = ${mark(1)} AND "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = ${mark(2)})`,
    [optionKey(DELETED.model), optionKey(DELETED.brand)],
  );
}

/**
 * Reads the migrated catalog's brands and models in order, and checks the order, the letters, the trees kept, the
 * deleted model left out, and that every id is a UUID.
 * @param client The migrated database.
 */
async function checkMigrated(client: PrismaClient) {
  const brands = await client.catalogBrand.findMany({ orderBy: { position: "asc" }, include: { brand: true } });
  const models = await client.catalogModel.findMany({ orderBy: { position: "asc" }, include: { vehicleModel: true, generations: true } });
  const modelsOf = (brandId: string) => models.filter((model) => model.vehicleModel.brandId === brandId);
  const sample = TEST_CATALOG_DATA.brands;
  const others = STARTING_VEHICLE_BRANDS.filter((brand) => !sample.some((each) => optionKey(each.name) === optionKey(brand.name)));
  assert.deepEqual(
    brands.map((brand) => [brand.brand.name, brand.mark]),
    [...sample.map((brand) => [brand.name, brand.mark]), [ENVEMO.name, "EN"], ...others.map((brand) => [brand.name, brandMark(brand.name)])],
  );
  for (const brand of brands) {
    const listed = STARTING_VEHICLE_BRANDS.find((each) => optionKey(each.name) === brand.brand.nameKey)?.models ?? [];
    const kept = sample.find((each) => optionKey(each.name) === brand.brand.nameKey)?.models ?? [];
    const added = listed.filter((model) => !kept.some((each) => optionKey(each.name) === optionKey(model)));
    const expected = [...kept.map((model) => model.name), ...added].filter(
      (model) => !(brand.brand.nameKey === optionKey(DELETED.brand) && optionKey(model) === optionKey(DELETED.model)),
    );
    assert.deepEqual(modelsOf(brand.brandId).map((model) => model.vehicleModel.name), expected, brand.brand.name);
  }
  // The sample's trees stay: the Opala keeps its three generations, and the models added have none.
  assert.equal(models.find((model) => model.vehicleModel.nameKey === "opala")!.generations.length, 3);
  assert.equal(models.find((model) => model.vehicleModel.nameKey === "kombi")!.generations.length, 0);
  for (const row of [...brands, ...models]) {
    catalogIdParamsSchema.parse({ id: row.id });
  }
}

/**
 * Reads this migration's SQL, to run it a second time.
 * @param provider The database.
 * @returns The statements.
 */
function readMigration(provider: DatabaseProvider): string {
  return readFileSync(path.join(migrationsFolder(provider), MIGRATION, "migration.sql"), "utf8");
}

// Migrates a new SQLite file up to the migration before, adds the user's catalog brand and deletes the listed model,
// and migrates on, checking the catalog; then runs the migration's statements again and checks nothing changed.
test("API: on SQLite, the starting brands and models join the Catalog, the ones it has keeping their places", async () => {
  const file = path.join(FOLDER, "old.db");
  const url = `file:${file}`;
  await migrateBefore(url, "sqlite");
  const db = new Database(file);
  await writeOld(async (sql, values) => db.prepare(sql).run(...values), () => "?");
  db.close();

  assert.equal((await migrate(url))[0], MIGRATION);
  const client = createPrisma(url);
  opened.push(client);
  await checkMigrated(client);
  const counts = [await client.catalogBrand.count(), await client.catalogModel.count()];
  const again = new Database(file);
  again.exec(readMigration("sqlite"));
  again.close();
  assert.deepEqual([await client.catalogBrand.count(), await client.catalogModel.count()], counts);
  await checkMigrated(client);
});

// The same on a new PostgreSQL database; skipped without TEST_POSTGRES_URL.
test("API: on PostgreSQL, the starting brands and models join the Catalog, the ones it has keeping their places", { skip: !process.env.TEST_POSTGRES_URL }, async () => {
  const name = `apc_catalog_brands_${randomBytes(4).toString("hex")}`;
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

    assert.equal((await migrate(url.toString()))[0], MIGRATION);
    const client = createPrisma(url.toString());
    await checkMigrated(client);
    const counts = [await client.catalogBrand.count(), await client.catalogModel.count()];
    await db.query(readMigration("postgresql"));
    await db.end();
    assert.deepEqual([await client.catalogBrand.count(), await client.catalogModel.count()], counts);
    await checkMigrated(client);
    await client.$disconnect();
  } finally {
    await server.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await server.end();
  }
});
