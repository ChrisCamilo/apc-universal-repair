import { appendFileSync } from "node:fs";
import path from "node:path";
import { utilityProcess } from "electron";
import { PORT_IN_USE_EXIT_CODE, serverEnvironment, WRONG_KEY_EXIT_CODE, type ServerSetup } from "./bundledServer.js";
import { openLog } from "../logs.js";
import { superviseServer } from "./supervisor.js";

// Runs the bundled server (see bundledServer.ts) in an Electron utility process: a Node process of its own, so a busy
// request never freezes the window, and one that needs no Node fuse turned on. Its output goes to logs/api.log in
// userData (see logs.ts). When it stops by itself it starts again after a few seconds, a few times at most, and then
// the app is told it stays off, at once when its port is taken or its key doesn't open its file (see supervisor.ts); it stops with the app, or when the app moves it to another
// database, the stop waiting for it to exit, and once it has stopped the app can start it again. The database tasks
// (see serverTasks.ts) run beside it the same way, one process each.

/** How long to wait before starting a server that stopped by itself. */
const RESTART_DELAY_MS = 5_000;
/** How many times a server that stops by itself is started again. */
const RESTART_LIMIT = 5;

/**
 * Starts the bundled server and keeps it running.
 * @param setup How it runs.
 * @param onGiveUp Called with its last exit code when it stopped by itself for good and stays off.
 * @returns A function that stops it for good, and settles once it has stopped or after a timeout.
 */
export function startBundledServer(setup: ServerSetup, onGiveUp: (code: number) => void): (timeoutMs?: number) => Promise<void> {
  const log = openLog(setup.userData, "api");
  const write = (text: string | Buffer) => appendFileSync(log, text);
  return superviseServer({
    spawn: () => {
      const child = utilityProcess.fork(path.join(setup.serverDir, "server.mjs"), [], {
        env: { ...process.env, ...serverEnvironment(setup) },
        cwd: setup.userData,
        stdio: "pipe",
        serviceName: "APC Universal Repair server",
      });
      child.stdout?.on("data", write);
      child.stderr?.on("data", write);
      return child;
    },
    log: write,
    restartDelayMs: RESTART_DELAY_MS,
    restartLimit: RESTART_LIMIT,
    stopsForGood: (code) => code === PORT_IN_USE_EXIT_CODE || code === WRONG_KEY_EXIT_CODE,
    onGiveUp,
  });
}
