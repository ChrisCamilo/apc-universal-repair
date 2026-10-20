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

// The migration that gave items their brands (20261020000000_item_brands), against data from before it, on new SQLite
// files and, when TEST_POSTGRES_URL names a PostgreSQL server whose user can create databases, on a new PostgreSQL
// database (`pnpm --filter @apc/api test:db`). Each database is migrated up to the migration before, given items in
// the old shape with photos, then migrated on, and every item must keep its data in its one brand, with its photos.

/** The migration under test. */
const MIGRATION = "20261020000000_item_brands";
/** A folder for this run's SQLite files and the migrations before MIGRATION. */
const FOLDER = mkdtempSync(path.join(tmpdir(), "apc-item-brands-"));
/** The clients this run opens, closed at the end. */
const opened: PrismaClient[] = [];

/** The rows of the old shape, with fixed ids and dates, as a server from before held them. */
const OLD = {
  category: { id: "00000000-0000-4000-8000-0000000000c1", name: "Freios", nameKey: "freios" },
  partBrand: { id: "00000000-0000-4000-8000-0000000000b1", name: "Cobreq", nameKey: "cobreq" },
  brand: { id: "00000000-0000-4000-8000-0000000000a1", name: "Chevrolet", nameKey: "chevrolet" },
  model: { id: "00000000-0000-4000-8000-0000000000d1", name: "Opala", nameKey: "opala", brandId: "00000000-0000-4000-8000-0000000000a1" },
  items: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      code: "BP-1020",
      codeKey: "BP1020",
      name: "Pastilha de freio",
      nameKey: "pastilha de freio",
      vehicleModelId: "00000000-0000-4000-8000-0000000000d1",
      position: "FRONT",
      side: "BOTH",
      color: "Preto",
      location: "B-10",
      quantity: 2,
      minQuantity: 3,
      unitPriceCents: 8990,
      createdAt: "2026-10-08T05:25:31.021+00:00",
      updatedAt: "2026-10-09T10:00:00.000+00:00",
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      code: "CB 45000",
      codeKey: "CB45000",
      name: "Teste",
      nameKey: "teste",
      vehicleModelId: null,
      position: "NA",
      side: "NA",
      color: "N/A",
      location: null,
      quantity: 0,
      minQuantity: 0,
      unitPriceCents: 100,
      createdAt: "2026-10-14T05:36:07.579+00:00",
      updatedAt: "2026-10-14T05:36:07.579+00:00",
    },
  ],
  photos: [
    { id: "00000000-0000-4000-8000-0000000000e1", itemId: "00000000-0000-4000-8000-000000000001", position: 0, file: "e1.webp", thumbFile: "e1-thumb.webp" },
    { id: "00000000-0000-4000-8000-0000000000e2", itemId: "00000000-0000-4000-8000-000000000001", position: 1, file: "e2.jpg", thumbFile: "e2-thumb.webp" },
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
  await insert("PartBrand", OLD.partBrand);
  await insert("Brand", OLD.brand);
  await insert("VehicleModel", OLD.model);
  for (const item of OLD.items) {
    await insert("Item", { ...item, categoryId: OLD.category.id, partBrandId: OLD.partBrand.id, vehicleBrandId: OLD.brand.id });
  }
  for (const photo of OLD.photos) {
    await insert("ItemPhoto", photo);
  }
}

/**
 * Reads the migrated items with their brands and photos, and checks each item kept its data in its one brand, with
 * the item's id, and its photos in order.
 * @param client The migrated database.
 */
async function checkMigrated(client: PrismaClient) {
  const items = await client.item.findMany({
    orderBy: { createdAt: "asc" },
    include: { brands: { include: { photos: { orderBy: { position: "asc" } }, partBrand: true } }, vehicleModel: true },
  });
  assert.equal(items.length, OLD.items.length);
  for (const [index, item] of items.entries()) {
    const old = OLD.items[index];
    assert.equal(item.id, old.id);
    assert.equal(item.name, old.name);
    assert.equal(item.position, old.position);
    assert.equal(item.side, old.side);
    assert.equal(item.quantity, old.quantity);
    assert.equal(item.minQuantity, old.minQuantity);
    assert.equal(item.vehicleModelId, old.vehicleModelId);
    assert.equal(item.createdAt.toISOString(), new Date(old.createdAt).toISOString());
    assert.equal(item.brands.length, 1);
    const [brand] = item.brands;
    assert.deepEqual(
      {
        id: brand.id,
        partBrand: brand.partBrand.name,
        code: brand.code,
        codeKey: brand.codeKey,
        color: brand.color,
        location: brand.location,
        quantity: brand.quantity,
        unitPriceCents: brand.unitPriceCents,
        createdAt: brand.createdAt.toISOString(),
      },
      {
        id: old.id,
        partBrand: OLD.partBrand.name,
        code: old.code,
        codeKey: old.codeKey,
        color: old.color,
        location: old.location,
        quantity: old.quantity,
        unitPriceCents: old.unitPriceCents,
        createdAt: new Date(old.createdAt).toISOString(),
      },
    );
    assert.deepEqual(
      brand.photos.map((photo) => ({ id: photo.id, position: photo.position, file: photo.file, thumbFile: photo.thumbFile })),
      OLD.photos
        .filter((photo) => photo.itemId === old.id)
        .map((photo) => ({ id: photo.id, position: photo.position, file: photo.file, thumbFile: photo.thumbFile })),
    );
  }
}

// Migrates a new SQLite file up to the migration before, writes two items of the old shape, one with two photos, and
// migrates on, checking every item kept its data in its one brand, its photos too, and nothing was left behind.
test("API: on SQLite, every item from before becomes an item with one brand, its photos kept", async () => {
  const file = path.join(FOLDER, "old.db");
  const url = `file:${file}`;
  await migrateBefore(url, "sqlite");
  const db = new Database(file);
  await writeOld(async (sql, values) => db.prepare(sql).run(...values), () => "?");
  db.close();

  assert.deepEqual(await migrate(url), [MIGRATION]);
  const client = createPrisma(url);
  opened.push(client);
  await checkMigrated(client);
  const check = new Database(file, { readonly: true });
  assert.deepEqual(check.prepare("SELECT name FROM sqlite_master WHERE name LIKE '%_data'").all(), []);
  assert.deepEqual(check.pragma("foreign_key_check"), []);
  check.close();
});

// The same on a new PostgreSQL database; skipped without TEST_POSTGRES_URL.
test("API: on PostgreSQL, every item from before becomes an item with one brand, its photos kept", { skip: !process.env.TEST_POSTGRES_URL }, async () => {
  const name = `apc_item_brands_${randomBytes(4).toString("hex")}`;
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

    assert.deepEqual(await migrate(url.toString()), [MIGRATION]);
    const client = createPrisma(url.toString());
    await checkMigrated(client);
    await client.$disconnect();
  } finally {
    await server.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await server.end();
  }
});
