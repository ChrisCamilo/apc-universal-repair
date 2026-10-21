import { randomBytes } from "node:crypto";
import { closeSync, openSync, readFileSync, readSync, rmSync } from "node:fs";
import path from "node:path";
import { serverData } from "./bundledServer.ts";
import { readConfig, updateConfig, type DatabaseChoice, type DesktopConfig } from "./config.ts";

// The database the server the app ships runs on (see bundledServer.ts): SQLite, a file in userData, or PostgreSQL, at
// an address given in the app's server settings (see serverSettings.ts). The installer asks which
// (build/installer.nsh), but can't edit config.json, so it leaves its choice in INSTALLER_CHOICE_FILE in userData, and
// the app moves it into config.json as `database` on its next start, keeping a choice already there. For PostgreSQL
// the app then asks for the address before its server starts. The address holds a password, so config.json keeps it
// as `databaseUrl` only sealed by Electron's safeStorage, which Windows' DPAPI ties to the Windows user: the file
// alone opens nothing on another account or computer, and an address that can't be opened is asked for again. The
// SQLite file is encrypted with a key the app makes the first time it runs the server on it (apps/api/src/db/cipher.ts),
// sealed the same way as `sqliteKey`. The Servidor dialog shows its recovery copy until the user says it is kept apart
// from the computer: without it, a copy of the file opens nowhere else. A key is only made while there is no file yet,
// or it is still plain SQLite: a file already encrypted without its key in config.json is said to miss it, never given
// a new one that couldn't open it, and the recovery copy typed back brings it back.

/** The choices the installer offers. */
const CHOICES: readonly DatabaseChoice[] = ["sqlite", "postgresql"];
/** The file the installer leaves its choice in, in userData: "sqlite" or "postgresql". */
export const INSTALLER_CHOICE_FILE = "installer-database.txt";
/** A SQLite key: 32 bytes in hex, as the server takes it. */
const KEY_FORMAT = /^[0-9a-f]{64}$/;
/** How every plain SQLite file starts; an encrypted one starts with random bytes. */
const SQLITE_HEADER = "SQLite format 3\0";

/** What a database holds, as the server's checkDatabase task answers (apps/api/src/db/migrate.ts). */
export type DatabaseCheck = { missing: string[]; newer: string[]; foreign: boolean };
/** Why an import can't start, as the server's importProblem task answers (apps/api/src/db/import.ts). */
export type ImportProblem = "sourceBehind" | "sourceNewer" | "sourceNotApc" | "targetHasData";
/** Seals and opens text for this Windows user, as Electron's safeStorage does. */
export type Sealer = { encryptString: (text: string) => Buffer; decryptString: (sealed: Buffer) => string };
/**
 * The SQLite file's key, or why there is none: config.json keeps one this Windows user can't open, or keeps none for a
 * file already encrypted.
 */
export type SqliteKey = { key: string } | { problem: "unreadable" | "missing" };

/**
 * Moves the installer's choice into config.json, unless it holds one already, and removes the installer's file.
 * @param userData The app's userData folder, where config.json is.
 * @returns What config.json sets afterwards.
 */
export function adoptInstallerChoice(userData: string): DesktopConfig {
  const config = readConfig(userData);
  const file = path.join(userData, INSTALLER_CHOICE_FILE);
  let left: string;
  try {
    left = readFileSync(file, "utf8").trim();
  } catch {
    return config;
  }
  rmSync(file, { force: true });
  const choice = CHOICES.find((each) => each === left);
  if (!choice || config.database) {
    return config;
  }
  return updateConfig(userData, { database: choice });
}

/**
 * Says why the server can't run on a PostgreSQL database, from what it holds.
 * @param check What it holds.
 * @returns The reason, in Portuguese, or undefined when the server can run on it, migrating it if needed.
 */
export function databaseCheckMessage(check: DatabaseCheck): string | undefined {
  if (check.newer.length > 0) {
    return "Esse banco é de uma versão mais nova do APC. Atualize este app antes de usá-lo.";
  }
  if (check.foreign) {
    return "Esse banco tem tabelas de outro programa. Use um banco vazio, só para o APC.";
  }
  return undefined;
}

/**
 * Describes a PostgreSQL address without its user and password, for the settings to show.
 * @param url The address, e.g. "postgresql://postgres:secret@localhost:5432/apc".
 * @returns Its server and database, e.g. "localhost:5432/apc".
 */
export function describePostgresql(url: string): string {
  const { host, pathname } = new URL(url);
  return `${host}${pathname}`;
}

/**
 * Gets the SQLite file's key, making one the first time, while there is no file yet or it is still plain: 32 random
 * bytes, sealed in config.json, read as it is now, with its recovery copy still to be shown.
 * @param userData The app's userData folder, where config.json and the file are.
 * @param sealer safeStorage.
 * @returns The key; or "unreadable" when config.json keeps one this Windows user can't open, and "missing" when it keeps
 * none for a file already encrypted: a new key wouldn't open the file, and would take the place of the right one.
 */
export function ensureSqliteKey(userData: string, sealer: Sealer): SqliteKey {
  const { sqliteKey } = readConfig(userData);
  if (sqliteKey) {
    const key = unseal(sqliteKey, sealer);
    return key ? { key } : { problem: "unreadable" };
  }
  if (sqliteFileState(serverData(userData).sqliteFile) === "encrypted") {
    return { problem: "missing" };
  }
  const key = randomBytes(32).toString("hex");
  updateConfig(userData, { sqliteKey: seal(key, sealer), sqliteKeySaved: false });
  return { key };
}

/**
 * Writes a key as its recovery copy is shown: in uppercase, in groups of 8.
 * @param key The key, in hex.
 * @returns e.g. "1F2E3D4C-…", 8 groups.
 */
export function formatRecoveryKey(key: string): string {
  return key.toUpperCase().match(/.{8}/g)!.join("-");
}

/**
 * Says why an import can't start.
 * @param problem What the server's importProblem task found.
 * @returns The reason, in Portuguese.
 */
export function importProblemMessage(problem: ImportProblem): string {
  switch (problem) {
    case "sourceBehind":
      return "O banco antigo é de uma versão anterior do APC. Atualize-o primeiro: as migrações desta versão mudam a estrutura dele e mantêm os dados.";
    case "sourceNewer":
      return "O banco antigo é de uma versão mais nova do APC. Atualize este app antes de importar.";
    case "sourceNotApc":
      return "Esse banco não é de um servidor APC: não tem as tabelas dele.";
    case "targetHasData":
      return "O banco em uso já tem dados, como uma conta criada. Só dá para importar num banco vazio: importe antes de criar contas, ou troque para um banco vazio.";
  }
}

/**
 * Tells whether text is a PostgreSQL address the app can try: postgresql:// or postgres://, with a server.
 * @param text What was typed.
 * @returns True for an address such as "postgresql://postgres:secret@localhost:5432/apc".
 */
export function isPostgresqlUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return (url.protocol === "postgresql:" || url.protocol === "postgres:") && url.hostname !== "";
  } catch {
    return false;
  }
}

/**
 * Tells whether the app must ask for PostgreSQL's address before its server starts: PostgreSQL was chosen, and
 * config.json keeps no address this Windows user can open.
 * @param config What config.json sets.
 * @param sealer safeStorage.
 * @returns True when the address is missing.
 */
export function needsDatabaseAddress(config: DesktopConfig, sealer: Sealer): boolean {
  return config.database === "postgresql" && openDatabaseUrl(config, sealer) === undefined;
}

/**
 * Finds the photos folder of an old clone's server from its SQLite file: apps\api\uploads\photos, next to the file's
 * apps\api\data folder.
 * @param sqliteFile The old server's file, e.g. "C:\APC\apps\api\data\apc.db".
 * @returns The folder, e.g. "C:\APC\apps\api\uploads\photos".
 */
export function oldPhotosFolder(sqliteFile: string): string {
  return path.join(path.dirname(sqliteFile), "..", "uploads", "photos");
}

/**
 * Opens the PostgreSQL address config.json keeps.
 * @param config What config.json sets.
 * @param sealer safeStorage.
 * @returns The address, or undefined when there is none or it can't be opened, as on another Windows user.
 */
export function openDatabaseUrl(config: DesktopConfig, sealer: Sealer): string | undefined {
  return config.databaseUrl ? unseal(config.databaseUrl, sealer) : undefined;
}

/**
 * Reads a SQLite key typed back from its recovery copy, with or without its dashes and spaces, in any case.
 * @param text What was typed.
 * @returns The key, or undefined when it isn't one.
 */
export function readRecoveryKey(text: string): string | undefined {
  const key = text.replace(/[\s-]/g, "").toLowerCase();
  return KEY_FORMAT.test(key) ? key : undefined;
}

/**
 * Tells whether the Servidor dialog shows the SQLite key's recovery copy: a key was made, and the user hasn't said
 * they kept it.
 * @param config What config.json sets.
 * @returns True until the user says so.
 */
export function recoveryKeyPending(config: DesktopConfig): boolean {
  return config.sqliteKey !== undefined && config.sqliteKeySaved !== true;
}

/**
 * Seals a secret for config.json, such as PostgreSQL's address or the SQLite key.
 * @param text The secret.
 * @param sealer safeStorage.
 * @returns The sealed secret, in base64.
 */
export function seal(text: string, sealer: Sealer): string {
  return sealer.encryptString(text).toString("base64");
}

/**
 * Tells what the SQLite file is, from its first bytes: none yet, plain SQLite, or encrypted. A file that can't be read,
 * such as one locked or a folder in its place, counts as encrypted, so no key is ever made over one it can't see.
 * @param file The file, e.g. data\apc.db in userData.
 * @returns "new" when it is missing or empty, "plain" when it starts with SQLite's header, otherwise "encrypted".
 */
export function sqliteFileState(file: string): "new" | "plain" | "encrypted" {
  let fd: number | undefined;
  try {
    fd = openSync(file, "r");
    const head = Buffer.alloc(SQLITE_HEADER.length);
    const read = readSync(fd, head, 0, head.length, 0);
    if (read === 0) {
      return "new";
    }
    return head.subarray(0, read).toString("latin1") === SQLITE_HEADER ? "plain" : "encrypted";
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT" ? "new" : "encrypted";
  } finally {
    if (fd !== undefined) {
      closeSync(fd);
    }
  }
}

/**
 * Opens a secret config.json keeps sealed.
 * @param sealed The sealed secret, in base64.
 * @param sealer safeStorage.
 * @returns The secret, or undefined when this Windows user can't open it.
 */
function unseal(sealed: string, sealer: Sealer): string | undefined {
  try {
    return sealer.decryptString(Buffer.from(sealed, "base64"));
  } catch {
    return undefined;
  }
}
