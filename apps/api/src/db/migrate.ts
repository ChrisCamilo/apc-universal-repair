import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import pg from "pg";
import { keyScript, sqliteKey } from "./cipher.js";
import { API_DIR, databaseProvider, sqliteFile, type DatabaseProvider } from "./provider.js";

// Applies the migrations of the database DATABASE_URL names, without the Prisma CLI, so the desktop app can migrate
// the server it ships (which has no CLI) and `db:migrate` does the same. Each pending migration's migration.sql runs
// whole, in one transaction, through the database's own driver (pg's simple queries take several statements and
// function bodies; better-sqlite3's exec does too), and is recorded in _prisma_migrations exactly as `prisma migrate
// deploy` records it: a random id, the SHA-256 of the file's bytes, and when it started and finished. A database
// migrated either way is the same to the other. A migration recorded as started but not finished, or one that fails,
// stops the run, leaving the ones after it unapplied. APC_MIGRATIONS_DIR points at the migrations the app ships, with
// one folder per database ("postgresql", "sqlite"); without it, they are read from prisma/ in the repo. Before the
// desktop app moves its server onto a database, or imports one, checkDatabase says what it holds: the migrations of
// this version it lacks, the ones of a newer version, and whether its tables are another app's.

/** How long a PostgreSQL server may take to accept the connection, so an address that doesn't answer fails soon. */
const CONNECT_TIMEOUT_MS = 10_000;

/** The table Prisma keeps applied migrations in, as `prisma migrate deploy` creates it on each database. */
const MIGRATIONS_TABLE: Record<DatabaseProvider, string> = {
  postgresql: `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  )`,
  sqlite: `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "checksum" TEXT NOT NULL,
    "finished_at" DATETIME,
    "migration_name" TEXT NOT NULL,
    "logs" TEXT,
    "rolled_back_at" DATETIME,
    "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
  )`,
};

/** What a database holds, as far as running this version's server on it goes. */
export type DatabaseCheck = {
  /** The migrations of this version it hasn't applied, oldest first: all of them for an empty database. */
  missing: string[];
  /** The migrations it has applied that this version doesn't know: it is of a newer version. */
  newer: string[];
  /** Whether it holds tables but no migrations: another app's database, which the server shouldn't write to. */
  foreign: boolean;
};
/** A connection to the database being migrated, through its own driver. */
type Connection = {
  /** Runs statements with no answer, several at once. */
  exec: (sql: string) => Promise<void>;
  /** Reads the migrations recorded so far. */
  recorded: () => Promise<{ migration_name: string; finished_at: unknown; rolled_back_at: unknown }[]>;
  /** Records a migration applied. */
  record: (row: { id: string; checksum: string; name: string; startedAt: Date; finishedAt: Date }) => Promise<void>;
  /** Lists the database's tables. */
  tables: () => Promise<string[]>;
  close: () => Promise<void>;
};

/**
 * Checks what a database holds before the server runs on it or its data is copied: what it lacks of this version,
 * what it has of a newer one, and whether its tables are another app's. A SQLite file must exist.
 * @param url The database's DATABASE_URL.
 * @returns What it holds.
 */
export async function checkDatabase(url: string): Promise<DatabaseCheck> {
  const provider = databaseProvider(url);
  if (provider === "sqlite" && !existsSync(sqliteFile(url))) {
    throw new Error(`There is no file at ${sqliteFile(url)}.`);
  }
  const connection = await connect(url);
  try {
    const tables = await connection.tables();
    const migrated = tables.includes("_prisma_migrations");
    const recorded = migrated ? await connection.recorded() : [];
    const applied = new Set(recorded.filter((row) => row.finished_at !== null && row.rolled_back_at === null).map((row) => row.migration_name));
    const known = migrationNames(provider);
    return {
      missing: known.filter((name) => !applied.has(name)),
      newer: [...applied].filter((name) => !known.includes(name)).sort(),
      foreign: !migrated && tables.length > 0,
    };
  } finally {
    await connection.close();
  }
}

/**
 * Opens a database through its own driver, creating a SQLite file's folder when it is missing, with its key when it is
 * encrypted (see cipher.ts).
 * @param url The database's DATABASE_URL.
 * @returns The connection.
 */
async function connect(url: string): Promise<Connection> {
  if (databaseProvider(url) === "sqlite") {
    const file = sqliteFile(url);
    mkdirSync(path.dirname(file), { recursive: true });
    const db = new Database(file);
    const key = sqliteKey(url);
    if (key) {
      db.exec(keyScript(key));
    }
    return {
      exec: async (sql) => void db.exec(sql),
      recorded: async () => db.prepare(`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`).all() as never,
      record: async ({ id, checksum, name, startedAt, finishedAt }) =>
        void db
          .prepare(
            `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count) VALUES (?, ?, ?, ?, ?, 1)`,
          )
          .run(id, checksum, name, startedAt.getTime(), finishedAt.getTime()),
      tables: async () =>
        (db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`).all() as { name: string }[]).map(
          (row) => row.name,
        ),
      close: async () => void db.close(),
    };
  }
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: CONNECT_TIMEOUT_MS });
  await client.connect();
  return {
    exec: async (sql) => void (await client.query(sql)),
    recorded: async () => (await client.query(`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`)).rows,
    record: async ({ id, checksum, name, startedAt, finishedAt }) =>
      void (await client.query(
        `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count) VALUES ($1, $2, $3, $4, $5, 1)`,
        [id, checksum, name, startedAt, finishedAt],
      )),
    tables: async () =>
      (await client.query<{ table_name: string }>(`SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()`)).rows.map(
        (row) => row.table_name,
      ),
    close: () => client.end(),
  };
}

/**
 * Applies the pending migrations of a database.
 * @param url The database's DATABASE_URL.
 * @param onApplied Called after each migration applied, e.g. to log it.
 * @returns The names of the migrations applied, oldest first; empty when there were none pending.
 */
export async function migrate(url: string, onApplied: (name: string) => void = () => {}): Promise<string[]> {
  const provider = databaseProvider(url);
  const connection = await connect(url);
  try {
    await connection.exec(MIGRATIONS_TABLE[provider]);
    const recorded = await connection.recorded();
    const unfinished = recorded.find((row) => row.finished_at === null && row.rolled_back_at === null);
    if (unfinished) {
      throw new Error(`The migration ${unfinished.migration_name} started before and didn't finish: fix the database first.`);
    }
    const applied = new Set(recorded.filter((row) => row.rolled_back_at === null).map((row) => row.migration_name));
    const pending = migrationNames(provider).filter((name) => !applied.has(name));
    for (const name of pending) {
      const script = readFileSync(path.join(migrationsFolder(provider), name, "migration.sql"));
      const startedAt = new Date();
      await connection.exec("BEGIN");
      try {
        await connection.exec(script.toString("utf8"));
        await connection.record({
          id: randomUUID(),
          checksum: createHash("sha256").update(script).digest("hex"),
          name,
          startedAt,
          finishedAt: new Date(),
        });
        await connection.exec("COMMIT");
      } catch (error) {
        await connection.exec("ROLLBACK");
        throw new Error(`The migration ${name} failed: ${(error as Error).message}`, { cause: error });
      }
      onApplied(name);
    }
    return pending;
  } finally {
    await connection.close();
  }
}

/**
 * Lists the migrations of a database, oldest first.
 * @param provider The database.
 * @returns The migrations' folder names, e.g. "20261015000000_sessions".
 */
export function migrationNames(provider: DatabaseProvider): string[] {
  return readdirSync(migrationsFolder(provider), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * Finds the folder a database's migrations are in: APC_MIGRATIONS_DIR's, as the desktop app ships them, or the repo's.
 * @param provider The database.
 * @returns The folder.
 */
export function migrationsFolder(provider: DatabaseProvider): string {
  if (process.env.APC_MIGRATIONS_DIR) {
    return path.join(process.env.APC_MIGRATIONS_DIR, provider);
  }
  return path.join(API_DIR, "prisma", ...(provider === "sqlite" ? ["sqlite"] : []), "migrations");
}
