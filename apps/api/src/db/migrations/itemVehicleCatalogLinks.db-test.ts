import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import Database from "better-sqlite3";
import pg from "pg";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { createPrisma } from "../client.js";
import { migrate, migrationNames, migrationsFolder } from "../tasks/migrate.js";
import type { DatabaseProvider } from "../provider.js";

// The migration that links item vehicles to the Catalog (20261119000000_item_vehicle_catalog_links), on new SQLite
// files and, when TEST_POSTGRES_URL names a PostgreSQL server whose user can create databases, on a new PostgreSQL
// database (`pnpm --filter @apc/api test:db`). Each database is migrated up to the migration before, which holds the
// sample catalog (the Opala's three generations, the third with Comodoro, Diplomata and SS), given an item whose
// vehicles cover every case, then migrated on:
// - the Opala 1980–1992 Diplomata links to the catalog's own generation and version;
// - the Opala 1990– Nova adds a generation "1990–" and its version Nova to the Catalog;
// - a brand and a model the Catalog lacks (Envemo Camper 1985–1986 GT) join it with the generation and version;
// - the Opala with only "ss" links to the catalog's one SS, and its generation;
// - the Opala with only "Solta", which the Catalog hasn't, goes to the item's short description;
// - a vehicle with no generation or version stays without links.

/** The migration under test. */
const MIGRATION = "20261119000000_item_vehicle_catalog_links";
/** A folder for this run's SQLite files and the migrations before MIGRATION. */
const FOLDER = mkdtempSync(path.join(tmpdir(), "apc-vehicle-links-"));
/** The clients this run opens, closed at the end. */
const opened: PrismaClient[] = [];
/** The sample catalog's ids (see the catalog migration). */
const SAMPLE = {
  chevrolet: "ca7a1000-0000-4000-8000-000000000001",
  opala: "ca7a1000-0000-4000-9000-000000000002",
  thirdGeneration: "ca7a1000-0000-4000-8000-000000000006",
  diplomata: "ca7a1000-0000-4000-8000-000000000008",
  ss: "ca7a1000-0000-4000-8000-000000000013",
};
/** The rows of the user's own, with fixed ids. */
const OWN = {
  category: "00000000-0000-4000-8000-0000000000c1",
  item: "00000000-0000-4000-8000-000000000001",
  envemo: "00000000-0000-4000-8000-0000000000b1",
  camper: "00000000-0000-4000-8000-0000000000d1",
};
/** The item's vehicles: brand, model, years and version, by their place. */
const VEHICLES: [string, string | null, number | null, number | null, string | null][] = [
  [SAMPLE.chevrolet, SAMPLE.opala, 1980, 1992, "Diplomata"],
  [SAMPLE.chevrolet, SAMPLE.opala, 1990, null, "Nova"],
  [OWN.envemo, OWN.camper, 1985, 1986, "GT"],
  [SAMPLE.chevrolet, SAMPLE.opala, null, null, "ss"],
  [SAMPLE.chevrolet, SAMPLE.opala, null, null, "Solta"],
  [SAMPLE.chevrolet, null, null, null, null],
];

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
 * Adds the brand and model of the user's own and the item with its vehicles, as a server from before held them.
 * @param run Runs one statement with its values, numbered $1, $2… on PostgreSQL and ?, ?… on SQLite.
 * @param mark The placeholder of the value at a 1-based place.
 */
async function writeOld(run: (sql: string, values: unknown[]) => Promise<unknown>, mark: (place: number) => string) {
  const marks = (count: number) => Array.from({ length: count }, (_, index) => mark(index + 1)).join(", ");
  await run(`INSERT INTO "Brand" ("id", "name", "nameKey") VALUES (${marks(3)})`, [OWN.envemo, "Envemo", "envemo"]);
  await run(`INSERT INTO "VehicleModel" ("id", "name", "nameKey", "brandId") VALUES (${marks(4)})`, [OWN.camper, "Camper", "camper", OWN.envemo]);
  await run(`INSERT INTO "Category" ("id", "name", "nameKey") VALUES (${marks(3)})`, [OWN.category, "Faróis", "farois"]);
  await run(
    `INSERT INTO "Item" ("id", "name", "nameKey", "categoryId", "position", "side", "quantity", "minQuantity", "description", "createdAt", "updatedAt")
     VALUES (${mark(1)}, 'Farol', 'farol', ${mark(2)}, 'NA', 'NA', 0, 0, 'Lado esquerdo', ${mark(3)}, ${mark(4)})`,
    [OWN.item, OWN.category, "2026-11-10T12:00:00.000Z", "2026-11-10T12:00:00.000Z"],
  );
  for (const [position, [brand, model, firstYear, lastYear, version]] of VEHICLES.entries()) {
    await run(
      `INSERT INTO "ItemVehicle" ("id", "itemId", "position", "vehicleBrandId", "vehicleModelId", "firstYear", "lastYear", "version") VALUES (${marks(8)})`,
      [`00000000-0000-4000-8000-00000000010${position}`, OWN.item, position, brand, model, firstYear, lastYear, version],
    );
  }
}

/**
 * Reads the migrated item and checks each vehicle's links, what joined the Catalog, and the short description.
 * @param client The migrated database.
 */
async function checkMigrated(client: PrismaClient) {
  const vehicles = await client.itemVehicle.findMany({
    where: { itemId: OWN.item },
    orderBy: { position: "asc" },
    include: { generation: { include: { model: { include: { vehicleModel: true } } } }, version: true },
  });
  assert.deepEqual(
    vehicles.map((vehicle) => [vehicle.generation?.name ?? null, vehicle.generation?.firstYear ?? null, vehicle.generation?.lastYear ?? null, vehicle.version?.name ?? null]),
    [
      ["Terceira geração", 1980, 1992, "Diplomata"],
      ["1990–", 1990, null, "Nova"],
      ["1985–1986", 1985, 1986, "GT"],
      ["Terceira geração", 1980, 1992, "SS"],
      [null, null, null, null],
      [null, null, null, null],
    ],
  );
  assert.deepEqual([vehicles[0].generationId, vehicles[0].versionId, vehicles[3].versionId], [SAMPLE.thirdGeneration, SAMPLE.diplomata, SAMPLE.ss]);
  assert.equal(vehicles[2].generation!.model.vehicleModel.name, "Camper");
  const envemo = await client.catalogBrand.findUnique({ where: { brandId: OWN.envemo } });
  assert.equal(envemo?.mark, "EN");
  const item = await client.item.findUniqueOrThrow({ where: { id: OWN.item } });
  assert.equal(item.description, "Lado esquerdo · Solta");
  for (const id of [envemo!.id, vehicles[1].generationId!, vehicles[1].versionId!]) {
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  }
}

// Migrates a new SQLite file up to the migration before, adds the item, and migrates on, checking each vehicle's links,
// what joined the Catalog and the short description, and that no row points nowhere.
test("API: on SQLite, item vehicles link to the Catalog, adding what it lacks and keeping loose versions", async () => {
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
  const check = new Database(file, { readonly: true });
  assert.deepEqual(check.pragma("foreign_key_check"), []);
  check.close();
});

// The same on a new PostgreSQL database; skipped without TEST_POSTGRES_URL.
test("API: on PostgreSQL, item vehicles link to the Catalog, adding what it lacks and keeping loose versions", { skip: !process.env.TEST_POSTGRES_URL }, async () => {
  const name = `apc_vehicle_links_${randomBytes(4).toString("hex")}`;
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
    await db.end();

    assert.equal((await migrate(url.toString()))[0], MIGRATION);
    const client = createPrisma(url.toString());
    await checkMigrated(client);
    await client.$disconnect();
  } finally {
    await server.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await server.end();
  }
});
