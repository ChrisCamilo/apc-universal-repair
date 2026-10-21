import { copyFileSync, existsSync, rmSync } from "node:fs";
import Database from "better-sqlite3";
import { databaseProvider, sqliteFile } from "./provider.js";

// The SQLite file encrypted at rest. better-sqlite3 is installed as better-sqlite3-multiple-ciphers (SQLite3 Multiple
// Ciphers), in SQLCipher 4's format, so the key also opens the file in tools that read SQLCipher, such as DB Browser
// for SQLite. A file is encrypted when it has a key: the server's own file, the one DATABASE_URL names, takes
// APC_SQLITE_KEY, which the desktop app sets; any other file takes the key a task gives for it (setSqliteKey), such as
// an encrypted file being imported. Without a key a file is plain SQLite, as in development. Every connection sends
// the key first (keyScript): the API's client (client.ts) and the migration runner (migrate.ts). A plain file that
// should be encrypted, as from before this was added, is encrypted in place when the server starts (ensureEncrypted),
// from a backup copy that is removed once the encrypted file reads back. A key that doesn't open its file stops the
// server with WRONG_KEY_ERROR, and keyOpens tells whether one does, as the desktop app asks of a recovery copy.

/** A key: 32 random bytes in hex, as the desktop app makes it. */
const KEY_FORMAT = /^[0-9a-f]{64}$/;
/** The code of the error a key that doesn't open its file throws, which the server exits on with WRONG_KEY_EXIT_CODE. */
export const WRONG_KEY_ERROR = "APC_WRONG_SQLITE_KEY";
/** The keys tasks gave, by file. */
const keys = new Map<string, string>();

/**
 * Checks a key before it goes into a statement.
 * @param key The key.
 * @returns The same key; it throws when it isn't 64 hex digits.
 */
function checked(key: string): string {
  if (!KEY_FORMAT.test(key)) {
    throw new Error("A SQLite key is 64 hex digits.");
  }
  return key;
}

/**
 * Makes sure a file that should be encrypted is: a plain one is encrypted in place, through a backup copy kept until
 * the encrypted file reads back. A new file, or one already encrypted with the key, is left as it is.
 * @param url The database's DATABASE_URL.
 * @returns "encrypted" when it encrypted the file, "unchanged" otherwise; it rejects when the key doesn't open it.
 */
export function ensureEncrypted(url: string): "encrypted" | "unchanged" {
  const key = sqliteKey(url);
  if (!key || !existsSync(sqliteFile(url))) {
    return "unchanged";
  }
  const file = sqliteFile(url);
  if (opens(file, key)) {
    return "unchanged";
  }
  if (!opens(file, undefined)) {
    throw Object.assign(new Error(`The SQLite file ${file} doesn't open with its key: the key is wrong, or the file isn't a database.`), {
      code: WRONG_KEY_ERROR,
    });
  }
  // Rekeying needs the rollback journal: WAL's pages go into the file first.
  const plain = new Database(file);
  plain.pragma("journal_mode = DELETE");
  plain.close();
  const backup = `${file}.before-encryption`;
  copyFileSync(file, backup);
  try {
    const db = new Database(file);
    db.exec(rekeyScript(key));
    db.close();
    if (!opens(file, key)) {
      throw new Error("The encrypted file doesn't read back.");
    }
  } catch (error) {
    copyFileSync(backup, file);
    rmSync(backup, { force: true });
    throw new Error(`Couldn't encrypt ${file}; it was put back as it was: ${(error as Error).message}`, { cause: error });
  }
  rmSync(backup, { force: true });
  return "encrypted";
}

/**
 * Writes the statements that open an encrypted file, sent first on a connection.
 * @param key The file's key.
 * @returns The statements: SQLCipher 4's format, then the key.
 */
export function keyScript(key: string): string {
  return `PRAGMA cipher = 'sqlcipher'; PRAGMA legacy = 4; PRAGMA key = '${checked(key)}';`;
}

/**
 * Tells whether a file opens with a key, or with none.
 * @param file The SQLite file.
 * @param key Its key, or undefined to open it plain.
 * @returns True when its tables can be read.
 */
function opens(file: string, key: string | undefined): boolean {
  const db = new Database(file, { fileMustExist: true });
  try {
    if (key) {
      db.exec(keyScript(key));
    }
    db.prepare("SELECT count(*) FROM sqlite_master").get();
    return true;
  } catch {
    return false;
  } finally {
    db.close();
  }
}

/**
 * Tells whether text is a key, once spaces and dashes are taken out and it is put in lowercase, as the recovery copy is
 * typed back.
 * @param text What was typed, e.g. "1f2e…" or "1F2E-3D4C-…".
 * @returns The key, or undefined when it isn't one.
 */
export function readKey(text: string): string | undefined {
  const key = text.replace(/[\s-]/g, "").toLowerCase();
  return KEY_FORMAT.test(key) ? key : undefined;
}

/**
 * Tells whether a SQLite file opens with its key: the one a task gave for it, or APC_SQLITE_KEY for the server's own.
 * @param url The file's DATABASE_URL.
 * @returns True when the file exists and its key reads it.
 */
export function keyOpens(url: string): boolean {
  const file = sqliteFile(url);
  return existsSync(file) && opens(file, sqliteKey(url));
}

/**
 * Writes the statements that encrypt a plain file in place.
 * @param key The key to encrypt it with.
 * @returns The statements: SQLCipher 4's format, then the new key.
 */
function rekeyScript(key: string): string {
  return `PRAGMA cipher = 'sqlcipher'; PRAGMA legacy = 4; PRAGMA rekey = '${checked(key)}';`;
}

/**
 * Gives a file the key a task brought, such as an encrypted file being imported.
 * @param url The file's DATABASE_URL.
 * @param key Its key.
 */
export function setSqliteKey(url: string, key: string): void {
  keys.set(sqliteFile(url), checked(key));
}

/**
 * Finds the key of a SQLite file: the one a task gave for it, or APC_SQLITE_KEY for the server's own file.
 * @param url The file's DATABASE_URL.
 * @returns The key, or undefined for a plain file or a PostgreSQL database.
 */
export function sqliteKey(url: string): string | undefined {
  if (databaseProvider(url) !== "sqlite") {
    return undefined;
  }
  const own = process.env.DATABASE_URL;
  const ownKey = process.env.APC_SQLITE_KEY || undefined;
  const isOwn = own !== undefined && databaseProvider(own) === "sqlite" && sqliteFile(own) === sqliteFile(url);
  return keys.get(sqliteFile(url)) ?? (isOwn ? ownKey : undefined);
}
