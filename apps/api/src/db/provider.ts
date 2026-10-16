import path from "node:path";
import { fileURLToPath } from "node:url";

// Which database DATABASE_URL names: "file:…" is a SQLite file, anything else ("postgresql://…") PostgreSQL. A SQLite
// file's relative path is read from apps/api, as the Prisma CLI reads it from prisma.sqlite.config.ts there, so the
// API, the scripts and the CLI open the same file wherever they run from.

/** The API's folder, apps/api: two folders up from src/db, or from dist/db once built. */
export const API_DIR = fileURLToPath(new URL("../../", import.meta.url));

/** A database the API runs on. */
export type DatabaseProvider = "postgresql" | "sqlite";

/**
 * Tells which database a DATABASE_URL names.
 * @param url The DATABASE_URL, e.g. "file:./data/apc.db" or "postgresql://…".
 * @returns "sqlite" for a file, "postgresql" otherwise.
 */
export function databaseProvider(url: string): DatabaseProvider {
  return url.startsWith("file:") ? "sqlite" : "postgresql";
}

/**
 * Finds the file a SQLite DATABASE_URL names.
 * @param url The DATABASE_URL, e.g. "file:./data/apc.db".
 * @returns The file's absolute path; a relative one is read from apps/api.
 */
export function sqliteFile(url: string): string {
  return path.resolve(API_DIR, url.slice("file:".length));
}
