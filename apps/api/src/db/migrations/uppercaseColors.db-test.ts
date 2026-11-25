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

// The migration that writes every brand's color in uppercase (20261117000000_uppercase_colors), on new SQLite files
// and, when TEST_POSTGRES_URL names a PostgreSQL server whose user can create databases, on a new PostgreSQL database
// (`pnpm --filter @apc/api test:db`). Each database is migrated up to the migration before, given items whose brands
// have colors in every case, with accents, and N/A, then migrated on: each color is in uppercase, accents kept, N/A as
// it was, and running the migration again changes nothing.

/** The migration under test. */
const MIGRATION = "20261117000000_uppercase_colors";
/** A folder for this run's SQLite files and the migrations before MIGRATION. */
const FOLDER = mkdtempSync(path.join(tmpdir(), "apc-uppercase-colors-"));
/** The clients this run opens, closed at the end. */
const opened: PrismaClient[] = [];
/** The colors saved before the migration, by brand code, and what each must become. */
const COLORS = [
  { code: "UC-1", before: "Preto", after: "PRETO" },
  { code: "UC-2", before: "bordô", after: "BORDÔ" },
  { code: "UC-3", before: "cinza grafite", after: "CINZA GRAFITE" },
  { code: "UC-4", before: "Âmbar ação", after: "ÂMBAR AÇÃO" },
  { code: "UC-5", before: "AZUL", after: "AZUL" },
  { code: "UC-6", before: "N/A", after: "N/A" },
];
/** The ids of the items' category and part brand. */
const IDS = {
  category: "00000000-0000-4000-8000-0000000000c1",
  partBrand: "00000000-0000-4000-8000-0000000000b1",
};
/** When the rows were written, as a server from before held them. */
const WRITTEN = "2026-11-10T12:00:00.000Z";

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
 * Adds items whose brands have the colors of COLORS, as a server from before saved them.
 * @param run Runs one statement with its values, numbered $1, $2… on PostgreSQL and ?, ?… on SQLite.
 * @param mark The placeholder of the value at a 1-based place.
 */
async function writeOld(run: (sql: string, values: unknown[]) => Promise<unknown>, mark: (place: number) => string) {
  await run(`INSERT INTO "Category" ("id", "name", "nameKey") VALUES (${mark(1)}, 'Cores de teste', 'cores de teste')`, [IDS.category]);
  await run(`INSERT INTO "PartBrand" ("id", "name", "nameKey") VALUES (${mark(1)}, 'Marca de teste', 'marca de teste')`, [IDS.partBrand]);
  // An item for each color, since a part brand makes an item once.
  for (const [index, color] of COLORS.entries()) {
    const item = `00000000-0000-4000-8000-00000000010${index}`;
    await run(
      `INSERT INTO "Item" ("id", "name", "nameKey", "categoryId", "position", "side", "quantity", "minQuantity", "createdAt", "updatedAt")
       VALUES (${mark(1)}, ${mark(2)}, ${mark(3)}, ${mark(4)}, 'NA', 'NA', 0, 0, ${mark(5)}, ${mark(6)})`,
      [item, `Peça ${color.code}`, `peca ${color.code.toLowerCase()}`, IDS.category, WRITTEN, WRITTEN],
    );
    await run(
      `INSERT INTO "ItemBrand" ("id", "itemId", "position", "partBrandId", "code", "codeKey", "color", "quantity", "unitPriceCents", "createdAt", "updatedAt")
       VALUES (${mark(1)}, ${mark(2)}, 0, ${mark(3)}, ${mark(4)}, ${mark(5)}, ${mark(6)}, 0, 100, ${mark(7)}, ${mark(8)})`,
      [`00000000-0000-4000-8000-00000000020${index}`, item, IDS.partBrand, color.code, color.code.replace("-", ""), color.before, WRITTEN, WRITTEN],
    );
  }
}

/**
 * Reads the migrated brands' colors and checks each one became what COLORS says.
 * @param client The migrated database.
 */
async function checkMigrated(client: PrismaClient) {
  const brands = await client.itemBrand.findMany({ orderBy: { code: "asc" }, select: { code: true, color: true } });
  assert.deepEqual(
    brands.map((brand) => [brand.code, brand.color]),
    COLORS.map((color) => [color.code, color.after]),
  );
}

/**
 * Reads this migration's SQL, to run it a second time.
 * @param provider The database.
 * @returns The statements.
 */
function readMigration(provider: DatabaseProvider): string {
  return readFileSync(path.join(migrationsFolder(provider), MIGRATION, "migration.sql"), "utf8");
}

// Migrates a new SQLite file up to the migration before, adds brands with colors in every case, and migrates on,
// checking each color is in uppercase; then runs the migration's statements again and checks nothing changed.
test("API: on SQLite, every brand's color is migrated to uppercase, accents kept", async () => {
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
  const again = new Database(file);
  again.exec(readMigration("sqlite"));
  again.close();
  await checkMigrated(client);
});

// The same on a new PostgreSQL database; skipped without TEST_POSTGRES_URL.
test("API: on PostgreSQL, every brand's color is migrated to uppercase, accents kept", { skip: !process.env.TEST_POSTGRES_URL }, async () => {
  const name = `apc_uppercase_colors_${randomBytes(4).toString("hex")}`;
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
    await db.query(readMigration("postgresql"));
    await db.end();
    await checkMigrated(client);
    await client.$disconnect();
  } finally {
    await server.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await server.end();
  }
});
