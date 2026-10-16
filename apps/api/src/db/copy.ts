import { readdirSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "../generated/prisma/client.js";
import { API_DIR, databaseProvider } from "./provider.js";

// Copies the data from one database to another, PostgreSQL or SQLite in either direction (`pnpm --filter @apc/api
// db:copy`), to move the server from one to the other. Every table is copied as it is, ids, dates and keys included, in
// an order where each row's references are already there; sessions are left out, so everyone logs in again after the
// move. Photo files stay in PHOTOS_DIR; only their rows are copied. The copy refuses to start unless both databases
// have every migration of this version applied and the target is empty, and it runs in one transaction on the target,
// so a failure keeps nothing there.

/** How long the copy may take, in milliseconds: ten minutes, for a large inventory. */
const COPY_TIMEOUT_MS = 10 * 60 * 1000;
/** How many rows go in each insert, under SQLite's limit of variables per statement. */
const ROWS_PER_INSERT = 500;
/** The tables copied, by their client's name, each after the ones it references. */
export const TABLES = ["user", "category", "partBrand", "brand", "vehicleModel", "item", "itemPhoto"] as const;

/** A table of a client, as the copy uses it. */
type Table = {
  count: () => Promise<number>;
  createMany: (args: { data: object[] }) => Promise<unknown>;
  findMany: (args: { orderBy: { id: "asc" }; skip?: number; take?: number }) => Promise<object[]>;
};
/** A table copied, by its client's name. */
export type TableName = (typeof TABLES)[number];

/**
 * Copies every table but the sessions from one database to another, in one transaction on the target.
 * @param source The database the data comes from.
 * @param target An empty database, migrated to this version, the data goes to.
 * @param onCopied Called after each table, e.g. to show progress.
 * @returns How many rows each table holds on both sides once copied.
 */
export async function copyDatabase(
  source: PrismaClient,
  target: PrismaClient,
  onCopied: (table: TableName, rows: number) => void = () => {},
): Promise<Record<TableName, { source: number; target: number }>> {
  await target.$transaction(
    async (tx) => {
      for (const name of TABLES) {
        let copied = 0;
        for (;;) {
          const rows = await tableOf(source, name).findMany({ orderBy: { id: "asc" }, skip: copied, take: ROWS_PER_INSERT });
          if (rows.length === 0) {
            break;
          }
          await tableOf(tx as PrismaClient, name).createMany({ data: rows });
          copied += rows.length;
        }
        onCopied(name, copied);
      }
    },
    { maxWait: COPY_TIMEOUT_MS, timeout: COPY_TIMEOUT_MS },
  );
  const counts = await Promise.all(
    TABLES.map(async (name) => [name, { source: await tableOf(source, name).count(), target: await tableOf(target, name).count() }] as const),
  );
  return Object.fromEntries(counts) as Record<TableName, { source: number; target: number }>;
}

/**
 * Says why a copy from one database to another can't start: either one missing a migration of this version, or a
 * target that already holds data.
 * @param source The database the data comes from, and its DATABASE_URL.
 * @param target The database the data goes to, and its DATABASE_URL.
 * @returns The reasons, empty when the copy can start.
 */
export async function copyProblems(
  source: { client: PrismaClient; url: string },
  target: { client: PrismaClient; url: string },
): Promise<string[]> {
  const problems: string[] = [];
  for (const [side, database] of [["source", source], ["target", target]] as const) {
    const missing = await missingMigrations(database.client, database.url);
    if (missing.length > 0) {
      problems.push(`The ${side} lacks ${missing.length} migration(s) of this version, e.g. ${missing[0]}: run db:migrate on it first.`);
    }
  }
  if (problems.length === 0) {
    const held = await Promise.all([...TABLES.map((name) => tableOf(target.client, name).count()), target.client.session.count()]);
    if (held.some((rows) => rows > 0)) {
      problems.push("The target isn't empty: copy only into a database just made with db:migrate, without the seed.");
    }
  }
  return problems;
}

/**
 * Lists the migrations of this version a database hasn't applied.
 * @param client The database.
 * @param url Its DATABASE_URL, which says whose migrations to look at.
 * @returns The names of the missing migrations, oldest first; all of them when it has none applied.
 */
async function missingMigrations(client: PrismaClient, url: string): Promise<string[]> {
  const folder = path.join(API_DIR, "prisma", ...(databaseProvider(url) === "sqlite" ? ["sqlite"] : []), "migrations");
  const expected = readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const applied = await client
    .$queryRawUnsafe<{ migration_name: string }[]>(
      `SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
    )
    .catch(() => []);
  const names = new Set(applied.map((row) => row.migration_name));
  return expected.filter((name) => !names.has(name));
}

/**
 * Asks whether an API answers at an address, so the copy doesn't run while a server keeps writing to the source.
 * @param url The API's address, e.g. "http://localhost:3333".
 * @returns True when /health answers.
 */
export async function serverAnswers(url: string): Promise<boolean> {
  const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) }).catch(() => null);
  return response?.ok ?? false;
}

/**
 * Reaches a table of a client by its name.
 * @param client The database.
 * @param name The table's client name, e.g. "itemPhoto".
 * @returns The table.
 */
function tableOf(client: PrismaClient, name: TableName): Table {
  return client[name] as unknown as Table;
}
