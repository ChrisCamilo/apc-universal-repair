import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { DatabaseChoice, DesktopConfig } from "./config.js";

// The database the server on this computer uses, as the installer asked (build/installer.nsh): SQLite, a file in the
// API's folder, or PostgreSQL. The installer can't edit config.json, so it leaves its choice in INSTALLER_CHOICE_FILE
// in userData, and the app moves it into config.json as `database` on its next start, keeping a choice already there.
// The API reads DATABASE_URL from apps/api/.env and keeps its data in a SQLite file without one, so any start, the
// app's, the scheduled task's or the shortcut's, works for SQLite. For PostgreSQL the .env must name it: until it does,
// the app opens the guide instead of starting a server that would make an empty SQLite file.

/** The choices the installer offers. */
const CHOICES: readonly DatabaseChoice[] = ["sqlite", "postgresql"];
/** The file the installer leaves its choice in, in userData: "sqlite" or "postgresql". */
export const INSTALLER_CHOICE_FILE = "installer-database.txt";
/** The guide's step that sets up the server's .env, PostgreSQL's address included. */
export const POSTGRESQL_GUIDE_URL =
  "https://github.com/ChrisCamilo/apc-universal-repair/blob/main/docs/home-server.md#2-preparar-o-projeto-uma-vez";

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
  writeFileSync(path.join(userData, "config.json"), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

/**
 * Reads the DATABASE_URL a .env sets.
 * @param envText The text of apps/api/.env, or undefined when there is no file.
 * @returns The address, or undefined when the file sets none or an empty one.
 */
export function envDatabaseUrl(envText: string | undefined): string | undefined {
  const match = envText?.match(/^\s*DATABASE_URL\s*=\s*"?([^"\r\n]*)"?\s*$/m);
  return match?.[1].trim() || undefined;
}

/**
 * Tells whether the server can start with the database chosen: always for SQLite, and for PostgreSQL once the .env
 * names a database, which wins over the choice either way.
 * @param config What config.json sets.
 * @param envText The text of apps/api/.env, or undefined when there is no file.
 * @returns False when PostgreSQL was chosen and the .env doesn't name a database yet.
 */
export function serverCanStart(config: DesktopConfig, envText: string | undefined): boolean {
  return config.database !== "postgresql" || envDatabaseUrl(envText) !== undefined;
}
