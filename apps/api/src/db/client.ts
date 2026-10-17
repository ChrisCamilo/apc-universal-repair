import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaClient as SqliteClient } from "../generated/sqlite/client.js";
import { keyScript, sqliteKey } from "./cipher.js";
import { databaseProvider, databaseUrl, sqliteFile } from "./provider.js";

// The database follows DATABASE_URL (see provider.ts): a SQLite file opens through better-sqlite3 and the client
// generated from prisma/sqlite/schema.prisma, anything else PostgreSQL. Both clients come from the same models, so
// the rest of the API sees one PrismaClient. SQLite runs on a single connection that waits up to SQLITE_TIMEOUT_MS for
// a write lock held by another process (a migration, a script) instead of failing; an encrypted file gets its key as
// the connection's first statement (see cipher.ts).

/** How long SQLite waits for another process's write lock, in milliseconds. */
const SQLITE_TIMEOUT_MS = 5000;

const url = databaseUrl();

export const prisma = createPrisma(url);

/**
 * Opens a database: the API's own, or another one, as copying between databases does.
 * @param databaseUrl A DATABASE_URL, e.g. "file:./data/apc.db" or "postgresql://…".
 * @returns Its client, typed as the PostgreSQL one, which has the same models.
 */
export function createPrisma(databaseUrl: string): PrismaClient {
  if (databaseProvider(databaseUrl) === "postgresql") {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  }
  const config = { url: `file:${sqliteFile(databaseUrl)}`, timeout: SQLITE_TIMEOUT_MS };
  const key = sqliteKey(databaseUrl);
  return new SqliteClient({ adapter: key ? keyedSqlite(config, key) : new PrismaBetterSqlite3(config) }) as unknown as PrismaClient;
}

/**
 * Builds the SQLite adapter for an encrypted file: each connection it opens sends the key before anything else.
 * @param config The file and how long to wait for a lock.
 * @param key The file's key.
 * @returns The adapter.
 */
function keyedSqlite(config: ConstructorParameters<typeof PrismaBetterSqlite3>[0], key: string): PrismaBetterSqlite3 {
  const adapter = new PrismaBetterSqlite3(config);
  const connect = adapter.connect.bind(adapter);
  adapter.connect = async () => {
    const connection = await connect();
    await connection.executeScript(keyScript(key));
    return connection;
  };
  return adapter;
}

/**
 * Readies the database before the API answers: on SQLite, turns on WAL, which lets the list be read while an item is
 * saved, and stays on in the file.
 */
export async function prepareDatabase(): Promise<void> {
  if (databaseProvider(url) === "sqlite") {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL");
  }
}
