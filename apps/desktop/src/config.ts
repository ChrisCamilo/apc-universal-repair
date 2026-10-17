import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// The desktop app's settings, in config.json in its userData folder: the database of the server it ships (see
// database.ts) and, for a server on another computer, its address, which APC_API_URL also sets. Without an address,
// the app runs the server it ships (see bundledServer.ts).

/** The API address when nothing sets another, as in development: the API on this computer. */
export const DEFAULT_API_URL = "http://localhost:3333";

/** The database the server on this computer uses, as the installer asked (see database.ts). */
export type DatabaseChoice = "postgresql" | "sqlite";
/** What config.json in the userData folder may set, e.g. `{ "apiUrl": "http://192.168.0.10:3333" }`. */
export type DesktopConfig = {
  apiUrl?: string;
  database?: DatabaseChoice;
  /** PostgreSQL's address, sealed by safeStorage, never in plain text (see database.ts). */
  databaseUrl?: string;
  /** The SQLite file's key, sealed by safeStorage, never in plain text (see database.ts). */
  sqliteKey?: string;
  /** Whether the user said they kept the key's recovery copy, which the Servidor dialog then stops showing. */
  sqliteKeySaved?: boolean;
  trayNoticeShown?: boolean;
};

/**
 * Reads config.json's text, with or without the BOM Windows PowerShell 5.1 writes, ignoring a file that isn't a JSON
 * object.
 * @param text The file's text, or undefined when there is no file.
 * @returns The settings it holds.
 */
export function parseConfig(text: string | undefined): DesktopConfig {
  if (!text) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(text.replace(/^\uFEFF/, ""));
    return typeof parsed === "object" && parsed !== null ? (parsed as DesktopConfig) : {};
  } catch {
    return {};
  }
}

/**
 * Reads config.json from the app's userData folder.
 * @param userData The app's userData folder.
 * @returns The settings it holds, none when there is no file.
 */
export function readConfig(userData: string): DesktopConfig {
  let text: string | undefined;
  try {
    text = readFileSync(path.join(userData, "config.json"), "utf8");
  } catch {
    // No file yet.
  }
  return parseConfig(text);
}

/**
 * Picks the API address: APC_API_URL, then config.json's apiUrl, then the default. An address that isn't http or
 * https is skipped. The trailing slash is dropped, so paths join on it.
 * @param envUrl APC_API_URL.
 * @param config What config.json sets.
 * @returns The API address, e.g. "http://192.168.0.10:3333".
 */
export function resolveApiUrl(envUrl: string | undefined, config: DesktopConfig): string {
  for (const candidate of [envUrl, config.apiUrl]) {
    if (!candidate) {
      continue;
    }
    try {
      const url = new URL(candidate);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.href.replace(/\/+$/, "");
      }
    } catch {
      // Not an address: try the next one.
    }
  }
  return DEFAULT_API_URL;
}

/**
 * Writes config.json, as UTF-8 without a BOM, keeping every setting it is given.
 * @param userData The app's userData folder.
 * @param config What config.json sets.
 */
export function writeConfig(userData: string, config: DesktopConfig): void {
  writeFileSync(path.join(userData, "config.json"), `${JSON.stringify(config, null, 2)}\n`);
}
