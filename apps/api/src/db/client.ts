import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaClient as SqliteClient } from "../generated/sqlite/client.js";
import { databaseProvider, sqliteFile } from "./provider.js";

// The database follows DATABASE_URL (see provider.ts): a SQLite file opens through better-sqlite3 and the client
// generated from prisma/sqlite/schema.prisma, anything else PostgreSQL. Both clients come from the same models, so
// the rest of the API sees one PrismaClient. SQLite runs on a single connection that waits up to SQLITE_TIMEOUT_MS for
// a write lock held by another process (a migration, a script) instead of failing.

/** How long SQLite waits for another process's write lock, in milliseconds. */
const SQLITE_TIMEOUT_MS = 5000;

const url = process.env.DATABASE_URL ?? "";

export const prisma =
  databaseProvider(url) === "sqlite"
    ? (new SqliteClient({
        adapter: new PrismaBetterSqlite3({ url: `file:${sqliteFile(url)}`, timeout: SQLITE_TIMEOUT_MS }),
      }) as unknown as PrismaClient)
    : new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

/**
 * Readies the database before the API answers: on SQLite, turns on WAL, which lets the list be read while an item is
 * saved, and stays on in the file.
 */
export async function prepareDatabase(): Promise<void> {
  if (databaseProvider(url) === "sqlite") {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL");
  }
}
