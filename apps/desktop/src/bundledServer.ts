import path from "node:path";
import type { DesktopConfig } from "./config.js";

// The server the app ships: the API bundled into resources/server by scripts/bundle-server.mjs, which the app runs
// itself (see bundledProcess.ts) unless it is told to use a server elsewhere. Its data lives in userData: the SQLite
// file and the photos in data/, kept on uninstall. It migrates its database on start, so an update of the app updates
// the server and its database together, with no clone, script or tag to move.

/** The port the server listens on, for the phone: http://<this computer's address>:3333. */
export const SERVER_PORT = 3333;

/** Where the app finds a server elsewhere, and whether it runs from the Vite dev server. */
export type ServerSources = { envApiUrl?: string; envApiDir?: string; devUrl?: string };

/**
 * Builds the environment the bundled server runs with.
 * @param setup Where the server's files are, the app's userData folder, the port and the app's version.
 * @returns The variables: the SQLite file and the photos in userData, the port, the migrations it ships, which it
 * applies on start, and its version.
 */
export function serverEnvironment(setup: { serverDir: string; userData: string; port: number; version: string }): Record<string, string> {
  const data = path.join(setup.userData, "data");
  return {
    DATABASE_URL: `file:${path.join(data, "apc.db")}`,
    PHOTOS_DIR: path.join(data, "photos"),
    PORT: String(setup.port),
    APC_MIGRATIONS_DIR: path.join(setup.serverDir, "migrations"),
    APC_API_VERSION: setup.version,
    APC_MIGRATE_ON_START: "1",
  };
}

/**
 * Tells whether the app runs its own server: unless APC_API_URL or config.json's apiUrl names one, a clone's folder is
 * set to start one from (APC_API_DIR or config.json's apiDir), or the app runs from the Vite dev server, whose proxy
 * reaches the API in development.
 * @param sources The environment's settings.
 * @param config What config.json sets.
 * @returns True when the app runs the server it ships.
 */
export function usesBundledServer(sources: ServerSources, config: DesktopConfig): boolean {
  return !(sources.envApiUrl || config.apiUrl || sources.envApiDir || config.apiDir || sources.devUrl);
}
