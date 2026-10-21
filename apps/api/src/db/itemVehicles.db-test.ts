import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import Database from "better-sqlite3";
import pg from "pg";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createPrisma } from "./client.js";
import { migrate, migrationNames, migrationsFolder } from "./migrate.js";
import type { DatabaseProvider } from "./provider.js";

// The migration that gave items their vehicles (20261022000000_item_vehicles), against data from before it, on new
// SQLite files and, when TEST_POSTGRES_URL names a PostgreSQL server whose user can create databases, on a new
// PostgreSQL database (`pnpm --filter @apc/api test:db`). Each database is migrated up to the migration before, given
// items of that shape, with their vehicle in their own columns, brands, photos and original codes, then migrated on:
// every item must fit its one vehicle and keep its brands, photos and original codes.

/** The migration under test. */
const MIGRATION = "20261022000000_item_vehicles";
/** A folder for this run's SQLite files and the migrations before MIGRATION. */
const FOLDER = mkdtempSync(path.join(tmpdir(), "apc-item-vehicles-"));
/** The clients this run opens, closed at the end. */
const opened: PrismaClient[] = [];
/** The dates every row of the old shape is written with. */
const AT = { createdAt: "2026-10-08T05:25:31.021+00:00", updatedAt: "2026-10-09T10:00:00.000+00:00" };

/** The rows of the old shape, with fixed ids, as a server from before held them. */
const OLD = {
  category: { id: "00000000-0000-4000-8000-0000000000c1", name: "Freios", nameKey: "freios" },
  partBrands: [
    { id: "00000000-0000-4000-8000-0000000000b1", name: "Cobreq", nameKey: "cobreq" },
    { id: "00000000-0000-4000-8000-0000000000b2", name: "Fras-le", nameKey: "fras-le" },
  ],
  brand: { id: "00000000-0000-4000-8000-0000000000a1", name: "Chevrolet", nameKey: "chevrolet" },
  model: { id: "00000000-0000-4000-8000-0000000000d1", name: "Opala", nameKey: "opala", brandId: "00000000-0000-4000-8000-0000000000a1" },
  items: [
    { id: "00000000-0000-4000-8000-000000000001", name: "Pastilha de freio", nameKey: "pastilha de freio", vehicleModelId: "00000000-0000-4000-8000-0000000000d1", quantity: 3 },
    { id: "00000000-0000-4000-8000-000000000002", name: "Teste", nameKey: "teste", vehicleModelId: null, quantity: 0 },
  ],
  brands: [
    { id: "00000000-0000-4000-8000-000000000001", itemId: "00000000-0000-4000-8000-000000000001", position: 0, partBrandId: "00000000-0000-4000-8000-0000000000b1", code: "N-1210", codeKey: "N1210", quantity: 2, unitPriceCents: 7990 },
    { id: "00000000-0000-4000-8000-0000000000f2", itemId: "00000000-0000-4000-8000-000000000001", position: 1, partBrandId: "00000000-0000-4000-8000-0000000000b2", code: "PD/1210", codeKey: "PD1210", quantity: 1, unitPriceCents: 9490 },
    { id: "00000000-0000-4000-8000-000000000002", itemId: "00000000-0000-4000-8000-000000000002", position: 0, partBrandId: "00000000-0000-4000-8000-0000000000b1", code: "CB 45000", codeKey: "CB45000", quantity: 0, unitPriceCents: 100 },
  ],
  photos: [
    { id: "00000000-0000-4000-8000-0000000000e1", brandId: "00000000-0000-4000-8000-0000000000f2", position: 0, file: "e1.webp", thumbFile: "e1-thumb.webp" },
  ],
  originalCodes: [
    { id: "00000000-0000-4000-8000-000000000ac1", itemId: "00000000-0000-4000-8000-000000000001", position: 0, code: "5U0 698 151", codeKey: "5U0698151" },
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
 * Writes the rows of the old shape, as a server from before held them.
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
  for (const partBrand of OLD.partBrands) {
    await insert("PartBrand", partBrand);
  }
  await insert("Brand", OLD.brand);
  await insert("VehicleModel", OLD.model);
  for (const item of OLD.items) {
    await insert("Item", { ...item, categoryId: OLD.category.id, vehicleBrandId: OLD.brand.id, minQuantity: 1, ...AT });
  }
  for (const brand of OLD.brands) {
    await insert("ItemBrand", { ...brand, ...AT });
  }
  for (const photo of OLD.photos) {
    await insert("ItemPhoto", photo);
  }
  for (const code of OLD.originalCodes) {
    await insert("ItemOriginalCode", code);
  }
}

/**
 * Reads the migrated items, and checks each fits its one vehicle, with the item's id, and kept its brands with their
 * photos and its original codes.
 * @param client The migrated database.
 */
async function checkMigrated(client: PrismaClient) {
  const items = await client.item.findMany({
    orderBy: { id: "asc" },
    include: { vehicles: true, brands: { orderBy: { position: "asc" }, include: { photos: true } }, originalCodes: true },
  });
  assert.deepEqual(
    items.map((item) => [item.id, item.name, item.quantity, item.minQuantity, item.createdAt.toISOString()]),
    OLD.items.map((item) => [item.id, item.name, item.quantity, 1, new Date(AT.createdAt).toISOString()]),
  );
  for (const [index, item] of items.entries()) {
    const old = OLD.items[index];
    assert.deepEqual(
      item.vehicles.map((vehicle) => ({ ...vehicle })),
      [{ id: old.id, itemId: old.id, position: 0, vehicleBrandId: OLD.brand.id, vehicleModelId: old.vehicleModelId }],
    );
    assert.deepEqual(
      item.brands.map((brand) => [brand.id, brand.code, brand.quantity, brand.photos.map((photo) => photo.file)]),
      OLD.brands
        .filter((brand) => brand.itemId === old.id)
        .map((brand) => [brand.id, brand.code, brand.quantity, OLD.photos.filter((photo) => photo.brandId === brand.id).map((photo) => photo.file)]),
    );
    assert.deepEqual(
      item.originalCodes.map((code) => code.code),
      OLD.originalCodes.filter((code) => code.itemId === old.id).map((code) => code.code),
    );
  }
}

// Migrates a new SQLite file up to the migration before, writes two items of the old shape, one of two brands with a
// photo and an original code, and migrates on, checking every item fits its one vehicle and kept the rest, and
// nothing was left behind.
test("API: on SQLite, every item from before fits its one vehicle, its brands, photos and codes kept", async () => {
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
  assert.deepEqual(check.prepare("SELECT name FROM sqlite_master WHERE name LIKE '%_data'").all(), []);
  assert.deepEqual(check.pragma("foreign_key_check"), []);
  check.close();
});

// The same on a new PostgreSQL database; skipped without TEST_POSTGRES_URL.
test("API: on PostgreSQL, every item from before fits its one vehicle, its brands, photos and codes kept", { skip: !process.env.TEST_POSTGRES_URL }, async () => {
  const name = `apc_item_vehicles_${randomBytes(4).toString("hex")}`;
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
