import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import Database from "better-sqlite3";
import pg from "pg";
import { optionKey } from "@apc/domain/items";
import { listEntriesSchema, vehicleModelsSchema } from "@apc/domain/lists";
import { STARTING_VEHICLE_BRANDS, VEHICLE_BRAND_ALIASES } from "@apc/domain/vehicle-lists";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createPrisma } from "./client.js";
import { migrate, migrationNames, migrationsFolder } from "./migrate.js";
import type { DatabaseProvider } from "./provider.js";

// The migration that starts the vehicle lists (20261112000000_vehicle_lists), against a server's lists from before it,
// on new SQLite files and, when TEST_POSTGRES_URL names a PostgreSQL server whose user can create databases, on a new
// PostgreSQL database (`pnpm --filter @apc/api test:db`). Each database is migrated up to the migration before, which
// already holds the starting catalog's Chevrolet with its Opala and Volkswagen with its Gol, and given items whose
// vehicles use those brands under other names ("GM" with its own Opala, "VW" with its own Gol), a brand under another
// name with no standard one held ("RAM"), a spelling of a listed brand ("Citroen") and a brand of the user's own, then
// migrated on: every item keeps its vehicles, now under the standard brands, the brands under other names are gone, the
// user's own brand and spelling stay, and every listed brand and model is there once.

/** The migration under test. */
const MIGRATION = "20261112000000_vehicle_lists";
/** A folder for this run's SQLite files and the migrations before MIGRATION. */
const FOLDER = mkdtempSync(path.join(tmpdir(), "apc-vehicle-lists-"));
/** The clients this run opens, closed at the end. */
const opened: PrismaClient[] = [];
/** The dates every item is written with. */
const AT = { createdAt: "2026-11-01T10:00:00.000+00:00", updatedAt: "2026-11-01T10:00:00.000+00:00" };

/** Makes the id of a row of the old lists from its number. */
const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
/** The ids the starting catalog's migration (20261106000000_catalog) gives its brands and models. */
const CATALOG = {
  chevrolet: "ca7a1000-0000-4000-8000-000000000001",
  opala: "ca7a1000-0000-4000-9000-000000000002",
  volkswagen: "ca7a1000-0000-4000-8000-000000000016",
  gol: "ca7a1000-0000-4000-9000-000000000005",
};

/** The lists and items of a server from before, with fixed ids. */
const OLD = {
  category: { id: uuid(900), name: "Freios", nameKey: "freios" },
  partBrand: { id: uuid(901), name: "Cobreq", nameKey: "cobreq" },
  brands: [
    { id: uuid(1), name: "GM", nameKey: "gm" },
    { id: uuid(3), name: "VW", nameKey: "vw" },
    { id: uuid(4), name: "Citroen", nameKey: "citroen" },
    { id: uuid(5), name: "RAM", nameKey: "ram" },
    { id: uuid(6), name: "Envemo", nameKey: "envemo" },
  ],
  models: [
    { id: uuid(11), name: "Opala", nameKey: "opala", brandId: uuid(1) },
    { id: uuid(12), name: "Chevette GP", nameKey: "chevette gp", brandId: uuid(1) },
    { id: uuid(14), name: "gol", nameKey: "gol", brandId: uuid(3) },
    { id: uuid(15), name: "C3", nameKey: "c3", brandId: uuid(4) },
    { id: uuid(16), name: "1500", nameKey: "1500", brandId: uuid(5) },
    { id: uuid(17), name: "Camper", nameKey: "camper", brandId: uuid(6) },
  ],
  /** Each item with its vehicles: brand and model ids, and optionally its generation and version. */
  items: [
    { id: uuid(101), name: "Pastilha GM", vehicles: [{ brand: uuid(1), model: uuid(11) }] },
    { id: uuid(102), name: "Pastilha Chevrolet", vehicles: [{ brand: CATALOG.chevrolet, model: CATALOG.opala, firstYear: 1980, lastYear: 1992, version: "Diplomata" }] },
    // The same Opala under both names: it keeps one after the merge.
    { id: uuid(103), name: "Disco das duas", vehicles: [{ brand: uuid(1), model: uuid(11) }, { brand: CATALOG.chevrolet, model: CATALOG.opala }, { brand: uuid(1), model: uuid(12) }] },
    { id: uuid(104), name: "Filtro VW", vehicles: [{ brand: uuid(3), model: uuid(14) }, { brand: uuid(3) }] },
    { id: uuid(105), name: "Lâmpada Citroen", vehicles: [{ brand: uuid(4), model: uuid(15) }] },
    { id: uuid(106), name: "Amortecedor RAM", vehicles: [{ brand: uuid(5), model: uuid(16) }] },
    { id: uuid(107), name: "Peça Envemo", vehicles: [{ brand: uuid(6), model: uuid(17) }] },
  ],
};

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
 * Writes the old lists and items.
 * @param run Runs one statement with its values, numbered $1, $2… on PostgreSQL and ?, ?… on SQLite.
 * @param mark The placeholder of the value at a 1-based place.
 */
async function writeOld(run: (sql: string, values: unknown[]) => Promise<unknown>, mark: (place: number) => string) {
  /** Inserts a row into a table by its columns. */
  const insert = (table: string, row: Record<string, unknown>) => {
    const columns = Object.keys(row);
    const sql = `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(", ")}) VALUES (${columns.map((_, index) => mark(index + 1)).join(", ")})`;
    return run(sql, Object.values(row));
  };
  await insert("Category", OLD.category);
  await insert("PartBrand", OLD.partBrand);
  for (const brand of OLD.brands) {
    await insert("Brand", brand);
  }
  for (const model of OLD.models) {
    await insert("VehicleModel", model);
  }
  let vehicle = 200;
  for (const item of OLD.items) {
    await insert("Item", { id: item.id, name: item.name, nameKey: optionKey(item.name), categoryId: OLD.category.id, minQuantity: 1, ...AT });
    await insert("ItemBrand", { id: uuid(++vehicle + 1000), itemId: item.id, position: 0, partBrandId: OLD.partBrand.id, code: `C-${item.id.slice(-3)}`, codeKey: `C${item.id.slice(-3)}`, quantity: 1, unitPriceCents: 100, ...AT });
    for (const [position, each] of item.vehicles.entries()) {
      await insert("ItemVehicle", {
        id: uuid(++vehicle),
        itemId: item.id,
        position,
        vehicleBrandId: each.brand,
        vehicleModelId: "model" in each ? each.model : null,
        firstYear: "firstYear" in each ? each.firstYear : null,
        lastYear: "lastYear" in each ? each.lastYear : null,
        version: "version" in each ? each.version : null,
      });
    }
  }
}

/**
 * Reads the migrated lists and items and checks the merges, what stayed, and that every listed brand and model is there.
 * @param client The migrated database.
 */
async function checkMigrated(client: PrismaClient) {
  const brands = await client.brand.findMany({ include: { models: true } });
  const brandOf = (name: string) => brands.find((brand) => brand.nameKey === optionKey(name));
  const vehiclesOf = async (itemId: string) =>
    (await client.itemVehicle.findMany({ where: { itemId }, orderBy: { position: "asc" }, include: { vehicleBrand: true, vehicleModel: true } })).map(
      (vehicle) => [vehicle.vehicleBrand.name, vehicle.vehicleModel?.name ?? null, vehicle.version],
    );

  // The brands under other names are gone, and each standard brand is held once.
  for (const alias of Object.keys(VEHICLE_BRAND_ALIASES)) {
    assert.equal(brandOf(alias), undefined, alias);
  }
  // GM and VW were merged into the catalog's Chevrolet and Volkswagen; RAM's row, with no Dodge held, became Dodge; the
  // user's "Citroen" and "Envemo" keep their rows and spellings.
  assert.equal(brandOf("Chevrolet")!.id, CATALOG.chevrolet);
  assert.equal(brandOf("Volkswagen")!.id, CATALOG.volkswagen);
  assert.deepEqual([brandOf("Dodge")!.id, brandOf("Dodge")!.name], [uuid(5), "Dodge"]);
  assert.deepEqual([brandOf("Citroën")!.id, brandOf("Citroën")!.name], [uuid(4), "Citroen"]);
  assert.deepEqual([brandOf("Envemo")!.id, brandOf("Envemo")!.name], [uuid(6), "Envemo"]);

  // Every item kept its vehicles, under the standard brands; the one with the Opala under both names keeps it once.
  assert.deepEqual(await vehiclesOf(uuid(101)), [["Chevrolet", "Opala", null]]);
  assert.deepEqual(await vehiclesOf(uuid(102)), [["Chevrolet", "Opala", "Diplomata"]]);
  assert.deepEqual(await vehiclesOf(uuid(103)), [["Chevrolet", "Opala", null], ["Chevrolet", "Chevette GP", null]]);
  assert.deepEqual(await vehiclesOf(uuid(104)), [["Volkswagen", "Gol", null], ["Volkswagen", null, null]]);
  assert.deepEqual(await vehiclesOf(uuid(105)), [["Citroen", "C3", null]]);
  assert.deepEqual(await vehiclesOf(uuid(106)), [["Dodge", "1500", null]]);
  assert.deepEqual(await vehiclesOf(uuid(107)), [["Envemo", "Camper", null]]);
  assert.equal(await client.item.count(), OLD.items.length);
  assert.equal(await client.itemBrand.count(), OLD.items.length);

  // Every brand and model is one the API can answer: its id a UUID, as the lists' schemas ask.
  listEntriesSchema.parse(brands.map(({ id, name }) => ({ id, name })));
  vehicleModelsSchema.parse(brands.flatMap((brand) => brand.models.map(({ id, name }) => ({ id, name, vehicleBrandId: brand.id }))));

  // Every listed brand and model is there once, the ones held before kept with their ids and spellings.
  for (const listed of STARTING_VEHICLE_BRANDS) {
    const brand = brandOf(listed.name);
    assert.ok(brand, listed.name);
    for (const model of listed.models) {
      assert.equal(brand.models.filter((each) => each.nameKey === optionKey(model)).length, 1, `${listed.name} ${model}`);
    }
  }
  assert.equal(brandOf("Chevrolet")!.models.find((model) => model.nameKey === "opala")!.id, CATALOG.opala);
  assert.equal(brandOf("Volkswagen")!.models.find((model) => model.nameKey === "gol")!.id, CATALOG.gol);
}

/**
 * Migrates a database on, with this migration first to apply, and checks the result.
 * @param url The database's DATABASE_URL.
 * @returns A client of the migrated database.
 */
async function migrateAndCheck(url: string) {
  assert.equal((await migrate(url))[0], MIGRATION);
  const client = createPrisma(url);
  opened.push(client);
  await checkMigrated(client);
  return client;
}

// Migrates a new SQLite file up to the migration before, writes the old lists and items, and migrates on, checking the
// merges, what stayed and the listed brands and models; then runs the migration's statements again and checks nothing
// changed.
test("API: on SQLite, the vehicle lists start with the listed brands and models, and no item loses a vehicle", async () => {
  const file = path.join(FOLDER, "old.db");
  const url = `file:${file}`;
  await migrateBefore(url, "sqlite");
  const db = new Database(file);
  await writeOld(async (sql, values) => db.prepare(sql).run(...values), () => "?");
  db.close();

  const client = await migrateAndCheck(url);
  const counts = [await client.brand.count(), await client.vehicleModel.count(), await client.itemVehicle.count()];
  const again = new Database(file);
  again.exec(readMigration("sqlite"));
  again.close();
  assert.deepEqual([await client.brand.count(), await client.vehicleModel.count(), await client.itemVehicle.count()], counts);
  await checkMigrated(client);
  const check = new Database(file, { readonly: true });
  assert.deepEqual(check.pragma("foreign_key_check"), []);
  check.close();
});

// The same on a new PostgreSQL database; skipped without TEST_POSTGRES_URL.
test("API: on PostgreSQL, the vehicle lists start with the listed brands and models, and no item loses a vehicle", { skip: !process.env.TEST_POSTGRES_URL }, async () => {
  const name = `apc_vehicle_lists_${randomBytes(4).toString("hex")}`;
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

    const client = await migrateAndCheck(url.toString());
    const counts = [await client.brand.count(), await client.vehicleModel.count(), await client.itemVehicle.count()];
    await db.query(readMigration("postgresql"));
    await db.end();
    assert.deepEqual([await client.brand.count(), await client.vehicleModel.count(), await client.itemVehicle.count()], counts);
    await checkMigrated(client);
    await client.$disconnect();
  } finally {
    await server.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await server.end();
  }
});

/**
 * Reads this migration's SQL, to run it a second time.
 * @param provider The database.
 * @returns The statements.
 */
function readMigration(provider: DatabaseProvider): string {
  return readFileSync(path.join(migrationsFolder(provider), MIGRATION, "migration.sql"), "utf8");
}
