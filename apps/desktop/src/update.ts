import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

// The desktop app updating itself from the GitHub Releases the Desktop workflow publishes (see main.ts): when it checks,
// and the channels through which the main process tells the page a new version is ready and the page asks to restart
// into it. Only the installed app checks: in development, unpackaged or as the portable exe there is nothing to update.
// The web build the app carries expects the API of the same version, so a server on another computer that answers
// another one on /health gets a warning. *Reiniciar agora* runs the installer with its window, so its progress shows
// and the new version opens by itself (RESTART_INSTALL, and build/installer.nsh); a version installed on quitting
// installs silently. While an update installs, a file in userData says which version goes in: an app opened meanwhile, still the old one or half installed, finds it and
// leaves the folder to the installer, and the new version deletes it once it opens.

/** How often the open app checks again: every 6 hours. */
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
/** The file in userData that says an update is being installed. */
export const INSTALL_MARKER = "installing-update.json";
/** How long an update counts as being installed; a marker older than this was left by an install that didn't end. */
export const INSTALL_WINDOW_MS = 5 * 60 * 1000;
/**
 * How *Reiniciar agora* runs the installer, as autoUpdater.quitAndInstall's arguments: with its window, so its progress
 * bar shows, and starting the new version once done.
 */
export const RESTART_INSTALL = { silent: false, runAfter: true } as const;
/** The channel the page asks to restart into the new version on (also written in preload.cts, which can't import this file). */
export const RESTART_TO_UPDATE_CHANNEL = "apc:restart-to-update";
/** The channel the main process tells the page a new version is ready on, with its number. */
export const UPDATE_READY_CHANNEL = "apc:update-ready";

/** What the marker says: the version going in, when its install started, and whether the installer opens it after. */
export type InstallMarker = { version: string; startedAt: number; reopens: boolean };
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
 * Deletes the marker of an update being installed, once it is in or was left behind.
 * @param userData The app's userData folder.
 */
export function clearInstallMarker(userData: string): void {
  rmSync(path.join(userData, INSTALL_MARKER), { force: true });
}

/**
 * Tells whether an app opening finds an update still being installed over it: a marker of another version than its
 * own, from the last few minutes.
 * @param marker What the marker says, if there is one.
 * @param version The opening app's version.
 * @param now The time now, in ms.
 * @returns True when it should leave the folder to the installer.
 */
export function installInProgress(marker: InstallMarker | undefined, version: string, now: number): boolean {
  return marker !== undefined && marker.version !== version && now - marker.startedAt < INSTALL_WINDOW_MS;
}

/**
 * Reads the marker of an update being installed.
 * @param userData The app's userData folder.
 * @returns What it says, or undefined when there is none or it can't be read.
 */
export function readInstallMarker(userData: string): InstallMarker | undefined {
  try {
    const marker = JSON.parse(readFileSync(path.join(userData, INSTALL_MARKER), "utf8")) as Partial<InstallMarker>;
    return typeof marker.version === "string" && typeof marker.startedAt === "number"
      ? { version: marker.version, startedAt: marker.startedAt, reopens: marker.reopens === true }
      : undefined;
  } catch {
    return undefined;
  }
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

/**
 * Writes the marker of an update about to be installed, before the app quits for the installer.
 * @param userData The app's userData folder.
 * @param marker The version going in, when, and whether the installer opens it after.
 */
export function writeInstallMarker(userData: string, marker: InstallMarker): void {
  writeFileSync(path.join(userData, INSTALL_MARKER), JSON.stringify(marker));
}
