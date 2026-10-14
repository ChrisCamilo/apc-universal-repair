// The desktop app updating itself from the GitHub Releases the Desktop workflow publishes (see main.ts): when it checks,
// and the channels through which the main process tells the page a new version is ready and the page asks to restart
// into it. Only the installed app checks: in development, unpackaged or as the portable exe there is nothing to update.
// The installed app also keeps the server on its own release: the web build it carries expects the API of the same
// version, so when /health answers another one it updates the API on this computer, or warns about one elsewhere.

/** How often the open app checks again: every 6 hours. */
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
/** The channel the page asks to restart into the new version on (also written in preload.cts, which can't import this file). */
export const RESTART_TO_UPDATE_CHANNEL = "apc:restart-to-update";
/** The channel the main process tells the page a new version is ready on, with its number. */
export const UPDATE_READY_CHANNEL = "apc:update-ready";

/** What to do about the server's version: nothing, update the one on this computer, or warn about one elsewhere. */
export type ServerAction = "none" | "update" | "warn";

/** How the app is running, as far as updating goes. */
export type UpdateRun = {
  /** Whether it runs packaged, from the installer or the portable exe. */
  isPackaged: boolean;
  /** APC_DEV_URL, set in development. */
  devUrl: string | undefined;
  /** PORTABLE_EXECUTABLE_DIR, which the portable exe sets. */
  portableDir: string | undefined;
};

/**
 * Tells whether the app checks for updates: only the installed app does.
 * @param run How the app is running.
 * @returns True when it runs packaged, from the installer, outside development.
 */
export function checksForUpdates(run: UpdateRun): boolean {
  return run.isPackaged && !run.devUrl && !run.portableDir;
}

/**
 * Decides what to do about the server's version, once the API answers.
 * @param appVersion The desktop app's version, e.g. "0.2.1".
 * @param apiVersion The version /health answers, undefined for an API before 0.2.0.
 * @param localApi Whether the API runs on this computer.
 * @returns "none" for the same version, otherwise "update" for an API on this computer and "warn" for one elsewhere.
 */
export function serverActionFor(appVersion: string, apiVersion: string | undefined, localApi: boolean): ServerAction {
  if (apiVersion === appVersion) {
    return "none";
  }
  return localApi ? "update" : "warn";
}

/**
 * Writes the warning about a server on another computer at another version than the app.
 * @param appVersion The desktop app's version, e.g. "0.2.1".
 * @param apiVersion The version /health answers, undefined for an API before 0.2.0.
 * @returns The warning, in Portuguese.
 */
export function serverVersionWarning(appVersion: string, apiVersion: string | undefined): string {
  const server = apiVersion ? `na versão ${apiVersion}` : "numa versão anterior à 0.2.0";
  return `O servidor APC está ${server}, e este app na ${appVersion}. Atualize o servidor no computador onde ele roda para evitar erros.`;
}
