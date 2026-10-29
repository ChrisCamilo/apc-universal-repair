import path from "node:path";

// The app's identity on Windows: the id the taskbar groups its windows by and Windows notifications are shown under,
// and the icon the taskbar shows. Windows takes the taskbar icon from a Start menu shortcut with the window's id, and
// Electron makes one, pointing at electron.exe with its atom icon, the first time a run from the clone shows a
// notification. Were that run to use the installed app's id, every APC window would show Electron's icon, so a run from
// the clone has an id of its own. The window also names its icon itself: the exe, which carries the APC gauge, once
// packaged, or build/icon.ico from the clone.

/** The installed app's id, the same as the installer's shortcuts (appId in electron-builder.yml). */
export const APP_USER_MODEL_ID = "com.apc.universalrepair";
/** The id of a run from the clone, with electron.exe: development and the tests. */
export const DEV_APP_USER_MODEL_ID = "com.apc.universalrepair.dev";

/** How the app runs, as far as its identity goes. */
export type IdentityRun = {
  /** Whether it runs packaged: installed, portable or unpacked. */
  isPackaged: boolean;
  /** The running exe. */
  execPath: string;
  /** The app's folder: apps/desktop from the clone. */
  appPath: string;
};

/**
 * Picks the app's id and the icon the taskbar shows.
 * @param run How the app runs.
 * @returns The id, and the icon file with the index of the icon in it.
 */
export function windowsIdentity(run: IdentityRun): { appId: string; iconPath: string; iconIndex: number } {
  if (run.isPackaged) {
    return { appId: APP_USER_MODEL_ID, iconPath: run.execPath, iconIndex: 0 };
  }
  return { appId: DEV_APP_USER_MODEL_ID, iconPath: path.win32.join(run.appPath, "build", "icon.ico"), iconIndex: 0 };
}
