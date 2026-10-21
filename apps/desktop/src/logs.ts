import { appendFileSync, mkdirSync, renameSync, statSync } from "node:fs";
import path from "node:path";
import { format } from "node:util";

// The app's logs, in logs/ under userData: api.log, the output of the server it ships (see bundledProcess.ts), and
// app.log, what the main process and the updater say, which a packaged app would otherwise write nowhere. A log is
// moved to its .old.log past LOG_LIMIT_BYTES when the app opens it, so it never grows much past twice that.

/** Size past which a log is moved aside when it is opened. */
export const LOG_LIMIT_BYTES = 10 * 1024 * 1024;

/**
 * Copies what the main process writes to the console into app.log, each line with its time and level, still writing
 * it to the console too.
 * @param userData The app's userData folder.
 * @returns The log's path.
 */
export function keepAppLog(userData: string): string {
  const log = openLog(userData, "app");
  for (const level of ["log", "info", "warn", "error"] as const) {
    const write = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      write(...args);
      try {
        appendFileSync(log, `${new Date().toISOString()} ${level.toUpperCase()} ${format(...args)}\n`);
      } catch {
        // A log that can't be written mustn't stop the app.
      }
    };
  }
  return log;
}

/**
 * Opens a log in userData's logs folder, moving it to <name>.old.log first when it passed the limit.
 * @param userData The app's userData folder.
 * @param name The log's name without its extension, e.g. "api".
 * @param limit The size past which it is moved aside, LOG_LIMIT_BYTES unless a test asks for less.
 * @returns Its path, e.g. "…\logs\api.log".
 */
export function openLog(userData: string, name: string, limit = LOG_LIMIT_BYTES): string {
  const logs = path.join(userData, "logs");
  mkdirSync(logs, { recursive: true });
  const log = path.join(logs, `${name}.log`);
  try {
    if (statSync(log).size > limit) {
      renameSync(log, path.join(logs, `${name}.old.log`));
    }
  } catch {
    // No log yet.
  }
  return log;
}
