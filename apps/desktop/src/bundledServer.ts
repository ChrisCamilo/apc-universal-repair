import path from "node:path";
import type { DesktopConfig } from "./config.js";

// The server the app ships: the API bundled into resources/server by scripts/bundle-server.mjs, which the app runs
// itself (see bundledProcess.ts) unless it is told to use a server elsewhere. Its data lives in userData: the SQLite
// file, encrypted with its key, and the photos in data/, kept on uninstall; on PostgreSQL (see database.ts), only the
// photos. It migrates its
// database on start, so an update of the app updates the server and its database together, with no clone, script or
// tag to move.

/**
 * The exit code of a server whose port another program holds, which isn't started again. It is PORT_IN_USE_EXIT_CODE
 * in @apc/shared/server, written here since the packaged app doesn't carry that package.
 */
export const PORT_IN_USE_EXIT_CODE = 98;
/**
 * The port the server listens on, for the phone: http://<this computer's address>:3000. It is SERVER_PORT in
 * @apc/shared/server, written here since the packaged app doesn't carry that package, and apart from the development
 * API's, so a run from the repo never meets the real data.
 */
export const SERVER_PORT = 3000;

/**
 * How the bundled server runs: where its files are, the app's userData folder, its port, the app's version, and
 * PostgreSQL's address when it runs on PostgreSQL, or the SQLite file's key.
 */
export type ServerSetup = { serverDir: string; userData: string; port: number; version: string; databaseUrl?: string; sqliteKey?: string };
/** Where the app finds a server elsewhere, and whether it runs from the Vite dev server. */
export type ServerSources = { envApiUrl?: string; devUrl?: string };

/**
 * Finds where the bundled server keeps its data.
 * @param userData The app's userData folder.
 * @returns The data folder, its SQLite file and its photos folder.
 */
export function serverData(userData: string): { folder: string; sqliteFile: string; photos: string } {
  const folder = path.join(userData, "data");
  return { folder, sqliteFile: path.join(folder, "apc.db"), photos: path.join(folder, "photos") };
}

/**
 * Builds the environment the bundled server runs with.
 * @param setup How it runs.
 * @returns The variables: the database, PostgreSQL's address or the SQLite file in userData with its key, the photos
 * in userData, the port, the migrations it ships, which it applies on start, and its version.
 */
export function serverEnvironment(setup: ServerSetup): Record<string, string> {
  const data = serverData(setup.userData);
  return {
    DATABASE_URL: setup.databaseUrl ?? `file:${data.sqliteFile}`,
    PHOTOS_DIR: data.photos,
    PORT: String(setup.port),
    APC_MIGRATIONS_DIR: path.join(setup.serverDir, "migrations"),
    APC_API_VERSION: setup.version,
    APC_MIGRATE_ON_START: "1",
    ...(!setup.databaseUrl && setup.sqliteKey ? { APC_SQLITE_KEY: setup.sqliteKey } : {}),
  };
}

/**
 * Tells whether the app runs its own server: unless APC_API_URL or config.json's apiUrl names one, or the app runs
 * from the Vite dev server, whose proxy reaches the API in development.
 * @param sources The environment's settings.
 * @param config What config.json sets.
 * @returns True when the app runs the server it ships.
 */
export function usesBundledServer(sources: ServerSources, config: DesktopConfig): boolean {
  return !(sources.envApiUrl || config.apiUrl || sources.devUrl);
}
