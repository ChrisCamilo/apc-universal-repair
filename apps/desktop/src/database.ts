import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { writeConfig, type DatabaseChoice, type DesktopConfig } from "./config.ts";

// The database the server the app ships runs on (see bundledServer.ts): SQLite, a file in userData, or PostgreSQL, at
// an address given in the app's server settings (see serverSettings.ts). The installer asks which
// (build/installer.nsh), but can't edit config.json, so it leaves its choice in INSTALLER_CHOICE_FILE in userData, and
// the app moves it into config.json as `database` on its next start, keeping a choice already there. For PostgreSQL
// the app then asks for the address before its server starts. The address holds a password, so config.json keeps it
// as `databaseUrl` only sealed by Electron's safeStorage, which Windows' DPAPI ties to the Windows user: the file
// alone opens nothing on another account or computer, and an address that can't be opened is asked for again.

/** The choices the installer offers. */
const CHOICES: readonly DatabaseChoice[] = ["sqlite", "postgresql"];
/** The file the installer leaves its choice in, in userData: "sqlite" or "postgresql". */
export const INSTALLER_CHOICE_FILE = "installer-database.txt";

/** What a database holds, as the server's checkDatabase task answers (apps/api/src/db/migrate.ts). */
export type DatabaseCheck = { missing: string[]; newer: string[]; foreign: boolean };
/** Why an import can't start, as the server's importProblem task answers (apps/api/src/db/import.ts). */
export type ImportProblem = "sourceBehind" | "sourceNewer" | "sourceNotApc" | "targetHasData";
/** Seals and opens text for this Windows user, as Electron's safeStorage does. */
export type Sealer = { encryptString: (text: string) => Buffer; decryptString: (sealed: Buffer) => string };

/**
 * Moves the installer's choice into config.json, unless it holds one already, and removes the installer's file.
 * @param userData The app's userData folder, where config.json is.
 * @param config What config.json sets now.
 * @returns What config.json sets afterwards.
 */
export function adoptInstallerChoice(userData: string, config: DesktopConfig): DesktopConfig {
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
  const next = { ...config, database: choice };
  writeConfig(userData, next);
  return next;
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
 * Says why an import can't start.
 * @param problem What the server's importProblem task found.
 * @returns The reason, in Portuguese.
 */
export function importProblemMessage(problem: ImportProblem): string {
  switch (problem) {
    case "sourceBehind":
      return "O banco antigo é de uma versão anterior do APC. Atualize-o primeiro: isso só acrescenta tabelas, sem mudar os dados.";
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
  if (!config.databaseUrl) {
    return undefined;
  }
  try {
    return sealer.decryptString(Buffer.from(config.databaseUrl, "base64"));
  } catch {
    return undefined;
  }
}

/**
 * Seals a PostgreSQL address for config.json.
 * @param url The address.
 * @param sealer safeStorage.
 * @returns The sealed address, in base64.
 */
export function sealDatabaseUrl(url: string, sealer: Sealer): string {
  return sealer.encryptString(url).toString("base64");
}
