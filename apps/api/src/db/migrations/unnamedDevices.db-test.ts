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

// The migration that empties the names the API wrote in Portuguese for devices authorized without one
// (20261126000000_unnamed_devices), on new SQLite files and, when TEST_POSTGRES_URL names a PostgreSQL server whose
// user can create databases, on a new PostgreSQL database (`pnpm --filter @apc/api test:db`). Each database is migrated
// up to the migration before, given devices named "Dispositivo <code>" and others named by hand, and migrated on: only
// the names the API wrote are empty, and running the migration again changes nothing.

/** The migration under test. */
const MIGRATION = "20261126000000_unnamed_devices";
/** A folder for this run's SQLite files and the migrations before MIGRATION. */
const FOLDER = mkdtempSync(path.join(tmpdir(), "apc-unnamed-devices-"));
/** The clients this run opens, closed at the end. */
const opened: PrismaClient[] = [];
/** The devices' names before the migration, and what each must become. */
const NAMES = [
  { before: "Dispositivo ABC234", after: "" },
  { before: "Dispositivo Q7XZ2M", after: "" },
  { before: "Dispositivo da Ana", after: "Dispositivo da Ana" },
  { before: "Dispositivo abc234", after: "Dispositivo abc234" },
  { before: "Dispositivo ABC2345", after: "Dispositivo ABC2345" },
  { before: "Dispositivo ABC189", after: "Dispositivo ABC189" },
  { before: "Celular da oficina", after: "Celular da oficina" },
  { before: "", after: "" },
];
/** The devices' user. */
const USER_ID = "00000000-0000-4000-8000-0000000000a1";

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
 * Adds a user with a device named each way of NAMES, as a server from before saved them.
 * @param run Runs one statement with its values, numbered $1, $2… on PostgreSQL and ?, ?… on SQLite.
 * @param mark The placeholder of the value at a 1-based place.
 */
async function writeOld(run: (sql: string, values: unknown[]) => Promise<unknown>, mark: (place: number) => string) {
  await run(
    `INSERT INTO "User" ("id", "username", "displayName", "email", "passwordHash") VALUES (${mark(1)}, 'ana', 'Ana', 'ana@oficina.com', 'scrypt$00$00')`,
    [USER_ID],
  );
  for (const [index, name] of NAMES.entries()) {
    await run(`INSERT INTO "Device" ("id", "userId", "publicKey", "status", "name") VALUES (${mark(1)}, ${mark(2)}, ${mark(3)}, 'AUTHORIZED', ${mark(4)})`, [
      `00000000-0000-4000-8000-00000000030${index}`,
      USER_ID,
      `key-${index}`,
      name.before,
    ]);
  }
}

/**
 * Reads the migrated devices' names and checks each one became what NAMES says.
 * @param client The migrated database.
 */
async function checkMigrated(client: PrismaClient) {
  const devices = await client.device.findMany({ orderBy: { id: "asc" }, select: { name: true } });
  assert.deepEqual(
    devices.map((device) => device.name),
    NAMES.map((name) => name.after),
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

// Migrates a new SQLite file up to the migration before, adds devices named by the API and by hand, and migrates on,
// checking only the API's names are empty; then runs the migration's statements again and checks nothing changed.
test("API: on SQLite, the device names the API wrote in Portuguese are emptied, the typed ones kept", async () => {
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
test(
  "API: on PostgreSQL, the device names the API wrote in Portuguese are emptied, the typed ones kept",
  { skip: !process.env.TEST_POSTGRES_URL },
  async () => {
    const name = `apc_unnamed_devices_${randomBytes(4).toString("hex")}`;
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
  },
);
