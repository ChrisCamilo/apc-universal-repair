import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaClient as SqliteClient } from "../generated/sqlite/client.js";

// The database follows DATABASE_URL: "file:…" opens a SQLite file through better-sqlite3 and the client generated
// from prisma/sqlite/schema.prisma, anything else PostgreSQL. Both clients come from the same models, so the rest of
// the API sees one PrismaClient. SQLite runs on a single connection that waits up to 5 s for a write lock held by
// another process (a migration, a script) instead of failing.

const url = process.env.DATABASE_URL ?? "";

export const prisma = url.startsWith("file:")
  ? (new SqliteClient({ adapter: new PrismaBetterSqlite3({ url }) }) as unknown as PrismaClient)
  : new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
