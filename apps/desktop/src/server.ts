import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

// Starts the API of #154 when the desktop app opens and the API on this computer doesn't answer, so the app works
// without turning the server on first. It runs apps/api/scripts/start-server.ps1 -Background, the same as the
// scheduled task: no window, the log in apps/api/logs/api.log, and the API started again if it stops. The API is left
// running when the app closes, so the phone keeps working; stop-server.ps1 turns it off. An API already up, or one on
// another computer, is left alone.

/** How long to wait for a starting API before opening the app anyway: the first start generates and migrates. */
const START_TIMEOUT_MS = 90_000;
/** How often to ask a starting API whether it is up. */
const POLL_MS = 1_000;

/**
 * Tells whether the API answers GET /health.
 * @param apiUrl The API address.
 * @returns True when it answers with a success.
 */
export async function apiAnswers(apiUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(3_000) });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Starts the API in the background from its folder, without waiting for it.
 * @param apiDir The apps/api folder of the clone on this computer.
 * @returns False when the folder has no start script, so nothing was started.
 */
export function startApi(apiDir: string): boolean {
  const script = path.join(apiDir, "scripts", "start-server.ps1");
  if (!existsSync(script)) {
    return false;
  }
  // Through PowerShell's Start-Process, which doesn't hand the app's own handles down: a child spawned straight from
  // here would hold them, and whoever opened the app would wait for the API to end. conhost --headless keeps the
  // console hidden, and the API outlives the app.
  const command =
    "Start-Process conhost.exe -WorkingDirectory $env:APC_API_DIR -ArgumentList " +
    "('--headless powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"' + $env:APC_START_SCRIPT + '\" -Background')";
  spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
    env: { ...process.env, APC_API_DIR: apiDir, APC_START_SCRIPT: script },
    stdio: "ignore",
    windowsHide: true,
  });
  return true;
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
