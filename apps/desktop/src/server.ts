import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

// Starts the API of #154 when the desktop app opens and the API on this computer doesn't answer, so the app works
// without turning the server on first. It runs apps/api/scripts/start-server.ps1 -Background, the same as the
// scheduled task: no window, the log in apps/api/logs/api.log, and the API started again if it stops. The API is left
// running when the app closes, so the phone keeps working; stop-server.ps1 turns it off. An API already up, or one on
// another computer, is left alone. When the API on this computer is of another version than the app, it brings it to
// the app's release through update-server.ps1 (see update.ts).

/** How often to ask a starting API whether it is up. */
const POLL_MS = 1_000;
/** How long to wait for a starting API before opening the app anyway: the first start generates and migrates. */
const START_TIMEOUT_MS = 90_000;
/** How long to wait for update-server.ps1, which waits up to 5 minutes for the API after installing. */
const UPDATE_TIMEOUT_MS = 600_000;

/** What GET /health answers: the API's version, absent on an API before 0.2.0. */
export type ApiHealth = { version?: string };

/**
 * Tells whether the API answers GET /health.
 * @param apiUrl The API address.
 * @returns True when it answers with a success.
 */
export async function apiAnswers(apiUrl: string): Promise<boolean> {
  return (await readHealth(apiUrl)) !== null;
}

/**
 * Asks the API's GET /health.
 * @param apiUrl The API address.
 * @returns What it answers, or null when it doesn't answer with a success.
 */
export async function readHealth(apiUrl: string): Promise<ApiHealth | null> {
  try {
    const response = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(3_000) });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json().catch(() => ({}))) as { version?: unknown };
    return typeof body.version === "string" ? { version: body.version } : {};
  } catch {
    return null;
  }
}

/**
 * Runs one of the API's scripts with no window. It goes through PowerShell's Start-Process, which doesn't hand the
 * app's own handles down: a child spawned straight from here would hold them, and whoever opened the app would wait for
 * it to end. conhost --headless keeps the console hidden, and the script outlives the app.
 * @param apiDir The apps/api folder of the clone on this computer.
 * @param name The script's file in apps/api/scripts, e.g. "start-server.ps1".
 * @param args Its arguments, e.g. "-Background".
 * @param wait Whether to wait for the script to end, rather than only for it to start.
 * @returns A promise that settles when the script ends, or started when not waiting; undefined when the folder has no
 * such script, so nothing was run.
 */
function runScript(apiDir: string, name: string, args: string, wait: boolean): Promise<void> | undefined {
  const script = path.join(apiDir, "scripts", name);
  if (!existsSync(script)) {
    return undefined;
  }
  const command =
    "$script = Start-Process conhost.exe -PassThru -WorkingDirectory $env:APC_API_DIR -ArgumentList " +
    "('--headless powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"' + $env:APC_SCRIPT + '\" ' + $env:APC_SCRIPT_ARGS)" +
    (wait ? "; $script.WaitForExit()" : "");
  const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
    env: { ...process.env, APC_API_DIR: apiDir, APC_SCRIPT: script, APC_SCRIPT_ARGS: args },
    stdio: "ignore",
    windowsHide: true,
  });
  return new Promise((resolve) => child.on("exit", () => resolve()).on("error", () => resolve()));
}

/**
 * Starts the API in the background from its folder, without waiting for it.
 * @param apiDir The apps/api folder of the clone on this computer.
 * @returns False when the folder has no start script, so nothing was started.
 */
export function startApi(apiDir: string): boolean {
  return runScript(apiDir, "start-server.ps1", "-Background", false) !== undefined;
}

/**
 * Brings the API on this computer to a release through update-server.ps1, which turns it off, checks the clone out at
 * the release's tag and turns it back on, or goes back to where it was when that fails.
 * @param apiDir The apps/api folder of the clone on this computer.
 * @param apiUrl The API address.
 * @param version The release, e.g. "0.2.1".
 * @returns A promise of whether the API answers that version once the script ends (or after UPDATE_TIMEOUT_MS);
 * undefined when the clone has no update script, as before 0.2.0, so nothing was run.
 */
export function updateApi(apiDir: string, apiUrl: string, version: string): Promise<boolean> | undefined {
  const ended = runScript(apiDir, "update-server.ps1", `-Version ${version}`, true);
  if (!ended) {
    return undefined;
  }
  const timedOut = new Promise<void>((resolve) => setTimeout(resolve, UPDATE_TIMEOUT_MS).unref());
  return Promise.race([ended, timedOut]).then(async () => (await readHealth(apiUrl))?.version === version);
}

/**
 * Waits for a starting API to answer.
 * @param apiUrl The API address.
 * @returns True once it answers, false after START_TIMEOUT_MS.
 */
export async function waitForApi(apiUrl: string): Promise<boolean> {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await apiAnswers(apiUrl)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  return false;
}
