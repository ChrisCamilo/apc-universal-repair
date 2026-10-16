import { appendFileSync, mkdirSync, renameSync, statSync } from "node:fs";
import path from "node:path";
import { utilityProcess, type UtilityProcess } from "electron";
import { serverEnvironment, type ServerSetup } from "./bundledServer.js";

// Runs the bundled server (see bundledServer.ts) in an Electron utility process: a Node process of its own, so a busy
// request never freezes the window, and one that needs no Node fuse turned on. Its output goes to logs/api.log in
// userData, moved to api.old.log past 10 MB. When it stops by itself it starts again after a few seconds, a few times
// at most, so a server that can't start doesn't loop forever; it stops with the app, or when the app moves it to
// another database, and once it has stopped the app can start it again. The database tasks (see serverTasks.ts) run
// beside it the same way, one process each.

/** Size past which the log is moved aside when the server starts. */
const LOG_LIMIT_BYTES = 10 * 1024 * 1024;
/** How long to wait before starting a server that stopped by itself. */
const RESTART_DELAY_MS = 5_000;
/** How many times a server that stops by itself is started again. */
const RESTART_LIMIT = 5;

/**
 * Starts the bundled server and keeps it running.
 * @param setup How it runs.
 * @returns A function that stops it for good, and settles once it has stopped.
 */
export function startBundledServer(setup: ServerSetup): () => Promise<void> {
  const logs = path.join(setup.userData, "logs");
  mkdirSync(logs, { recursive: true });
  const log = path.join(logs, "api.log");
  try {
    if (statSync(log).size > LOG_LIMIT_BYTES) {
      renameSync(log, path.join(logs, "api.old.log"));
    }
  } catch {
    // No log yet.
  }
  const write = (text: string | Buffer) => appendFileSync(log, text);
  let child: UtilityProcess | undefined;
  let running = false;
  let stopped = false;
  let restarts = 0;
  let exited = () => {};
  const start = () => {
    write(`${new Date().toISOString()} Starting the server.\n`);
    child = utilityProcess.fork(path.join(setup.serverDir, "server.mjs"), [], {
      env: { ...process.env, ...serverEnvironment(setup) },
      cwd: setup.userData,
      stdio: "pipe",
      serviceName: "APC Universal Repair server",
    });
    running = true;
    child.stdout?.on("data", write);
    child.stderr?.on("data", write);
    child.on("exit", (code) => {
      running = false;
      write(`${new Date().toISOString()} The server stopped (exit code ${code}).\n`);
      if (stopped) {
        exited();
      } else if (restarts < RESTART_LIMIT) {
        restarts++;
        setTimeout(() => !stopped && start(), RESTART_DELAY_MS).unref();
      }
    });
  };
  start();
  return () => {
    stopped = true;
    if (!running) {
      return Promise.resolve();
    }
    const done = new Promise<void>((resolve) => (exited = resolve));
    child?.kill();
    return done;
  };
}
