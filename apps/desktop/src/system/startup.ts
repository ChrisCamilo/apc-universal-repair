import { readFileSync, rmSync } from "node:fs";
import path from "node:path";

// Starting with Windows: the installed app registers itself with Windows to start at sign-in with HIDDEN_ARG, so it
// opens hidden in the tray with its server on (see tray.ts). The installer asks whether to (build/installer.nsh) and,
// as with the database, leaves the answer in INSTALLER_STARTUP_FILE in userData, which the app applies on its next
// start and removes; after that the tray's menu turns it on and off. Windows keeps the setting itself.

/** The argument Windows starts the app with at sign-in, so it opens hidden. */
export const HIDDEN_ARG = "--hidden";
/** The file the installer leaves its answer in, in userData: "yes" or "no". */
export const INSTALLER_STARTUP_FILE = "installer-startup.txt";

/**
 * Takes the installer's answer about starting with Windows, removing its file.
 * @param userData The app's userData folder.
 * @returns True for "yes", false for "no", undefined when there is no answer or it isn't one.
 */
export function takeInstallerStartup(userData: string): boolean | undefined {
  const file = path.join(userData, INSTALLER_STARTUP_FILE);
  let answer: string;
  try {
    answer = readFileSync(file, "utf8").trim();
  } catch {
    return undefined;
  }
  rmSync(file, { force: true });
  return answer === "yes" ? true : answer === "no" ? false : undefined;
}
