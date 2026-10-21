// Keeps the server process running (see bundledProcess.ts): when it stops by itself it starts again after a delay, a
// few times at most, and then it gives up and says so, so a server that can't start doesn't loop forever and the app
// can tell the user. Stopping it waits for it to exit, up to a timeout, so the app quits or moves the server only once
// its files and database are let go; once it has stopped, it can be supervised again.

/** How long stopping waits for the server to exit before going on anyway. */
export const STOP_TIMEOUT_MS = 5_000;

/** The server's process, as the supervisor uses it. */
export type ServerProcess = {
  on: (event: "exit", listener: (code: number) => void) => void;
  kill: () => unknown;
};
/** How the server is kept running. */
export type Supervision = {
  /** Starts a server process. */
  spawn: () => ServerProcess;
  /** Writes a line to the server's log. */
  log: (line: string) => void;
  /** How long to wait before starting a server that stopped by itself. */
  restartDelayMs: number;
  /** How many times a server that stops by itself is started again. */
  restartLimit: number;
  /** Called once the server stopped by itself past the limit and stays off. */
  onGiveUp: () => void;
};

/**
 * Starts the server and keeps it running.
 * @param supervision How.
 * @returns A function that stops it for good, settling once it has exited or after the timeout.
 */
export function superviseServer(supervision: Supervision): (timeoutMs?: number) => Promise<void> {
  const { spawn, log, restartDelayMs, restartLimit, onGiveUp } = supervision;
  let child: ServerProcess | undefined;
  let running = false;
  let stopped = false;
  let restarts = 0;
  let exited = () => {};
  const start = () => {
    log(`${new Date().toISOString()} Starting the server.\n`);
    child = spawn();
    running = true;
    child.on("exit", (code) => {
      running = false;
      log(`${new Date().toISOString()} The server stopped (exit code ${code}).\n`);
      if (stopped) {
        exited();
      } else if (restarts < restartLimit) {
        restarts++;
        setTimeout(() => !stopped && start(), restartDelayMs).unref();
      } else {
        log(`${new Date().toISOString()} The server stopped ${restarts + 1} times in a row; it stays off until the app starts it again.\n`);
        onGiveUp();
      }
    });
  };
  start();
  return (timeoutMs = STOP_TIMEOUT_MS) => {
    stopped = true;
    if (!running) {
      return Promise.resolve();
    }
    const done = new Promise<void>((resolve) => {
      // Held, not unref'd, so the stop settles even when nothing else keeps the event loop going; cleared on exit.
      const timer = setTimeout(resolve, timeoutMs);
      exited = () => {
        clearTimeout(timer);
        resolve();
      };
    });
    child?.kill();
    return done;
  };
}
