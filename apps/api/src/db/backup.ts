import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { keyScript, sqliteKey } from "./cipher.js";
import { checkDatabase } from "./migrate.js";
import { databaseProvider, sqliteFile } from "./provider.js";

// A copy of the SQLite file made before the server applies new migrations, as after the desktop app updates (see
// server.ts): a migration runs in a transaction, so one that fails leaves the database as it was, but one that does
// something wrong to the data needs a copy to go back to. The copy is made only when migrations are pending, with no
// connection open: WAL is checkpointed into the file first, and the file is copied to backups/ beside it, named after
// the version about to migrate it, e.g. "apc-before-0.5.0-2026-10-17T01-02-03.db". It keeps the file's key, so it is as
// safe as the file, and it must open before migrating, or the server doesn't migrate. Only the last KEPT_BACKUPS stay.
// PostgreSQL isn't copied: its data lives in its own server, which only its own tools (pg_dump) copy.

/** The name of a copy: the version that migrated after it, and when. */
const BACKUP_NAME = /^apc-before-.+\.db$/;
/** How many copies stay in backups/; the oldest go. */
export const KEPT_BACKUPS = 3;

/** What the copy before migrating did: made one, found nothing pending, or couldn't, on PostgreSQL. */
export type BackupResult = { made: string } | { skipped: "none-pending" | "new-file" | "postgresql" };

/**
 * Copies the database before new migrations run on it, when any are pending, and keeps the last KEPT_BACKUPS copies.
 * @param url The database's DATABASE_URL.
 * @param version The version about to migrate it, e.g. "0.5.0", which names the copy.
 * @param now When, which names the copy too.
 * @returns The copy made, or why none was; it rejects when the copy doesn't open, so nothing is migrated.
 */
export async function backupBeforeMigrating(url: string, version: string, now = new Date()): Promise<BackupResult> {
  if (databaseProvider(url) === "postgresql") {
    return (await checkDatabase(url)).missing.length > 0 ? { skipped: "postgresql" } : { skipped: "none-pending" };
  }
  const file = sqliteFile(url);
  if (!existsSync(file)) {
    return { skipped: "new-file" };
  }
  if ((await checkDatabase(url)).missing.length === 0) {
    return { skipped: "none-pending" };
  }
  const key = sqliteKey(url);
  const db = open(file, key);
  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
  } finally {
    db.close();
  }
  const folder = path.join(path.dirname(file), "backups");
  mkdirSync(folder, { recursive: true });
  const copy = path.join(folder, `apc-before-${version}-${now.toISOString().slice(0, 19).replace(/:/g, "-")}.db`);
  copyFileSync(file, copy);
  const check = open(copy, key);
  try {
    // A copy stands alone, with no -wal or -shm beside it; the server turns WAL on again once one is put back.
    check.pragma("journal_mode = DELETE");
    const result = check.pragma("quick_check", { simple: true });
    if (result !== "ok") {
      throw new Error(`The copy reads, but isn't sound: ${String(result)}.`);
    }
  } catch (error) {
    check.close();
    rmSync(copy, { force: true });
    throw new Error(`Couldn't copy ${file} before migrating, so nothing was migrated: ${(error as Error).message}`, { cause: error });
  }
  check.close();
  prune(folder);
  return { made: copy };
}

/**
 * Opens a SQLite file with its key, if it has one.
 * @param file The file.
 * @param key Its key, or undefined for a plain file.
 * @returns The connection.
 */
function open(file: string, key: string | undefined): Database.Database {
  const db = new Database(file, { fileMustExist: true });
  if (key) {
    db.exec(keyScript(key));
  }
  return db;
}

/**
 * Removes the oldest copies past KEPT_BACKUPS, by the time in their names.
 * @param folder The backups folder.
 */
function prune(folder: string): void {
  const copies = readdirSync(folder)
    .filter((name) => BACKUP_NAME.test(name))
    .sort((a, b) => (a.slice(-22) < b.slice(-22) ? -1 : 1));
  for (const name of copies.slice(0, -KEPT_BACKUPS)) {
    for (const suffix of ["", "-wal", "-shm"]) {
      rmSync(path.join(folder, `${name}${suffix}`), { force: true });
    }
  }
}
