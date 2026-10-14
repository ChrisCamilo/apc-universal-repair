// The desktop app updating itself from the GitHub Releases the Desktop workflow publishes (see main.ts): when it checks,
// and the channels through which the main process tells the page a new version is ready and the page asks to restart
// into it. Only the installed app checks: in development, unpackaged or as the portable exe there is nothing to update.

/** How often the open app checks again: every 6 hours. */
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
/** The channel the page asks to restart into the new version on (also written in preload.cts, which can't import this file). */
export const RESTART_TO_UPDATE_CHANNEL = "apc:restart-to-update";
/** The channel the main process tells the page a new version is ready on, with its number. */
export const UPDATE_READY_CHANNEL = "apc:update-ready";

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
