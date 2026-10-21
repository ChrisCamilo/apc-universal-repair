import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { superviseServer, type ServerProcess } from "./supervisor.ts";

/**
 * Makes server processes that exit when the test says, or when killed if they obey.
 * @param obeys Whether a killed process exits.
 * @returns The spawn function and the processes it made, in order.
 */
function processes(obeys = true) {
  const made: (EventEmitter & { exit: (code: number) => void; killed: boolean })[] = [];
  const spawn = (): ServerProcess => {
    const child = Object.assign(new EventEmitter(), {
      killed: false,
      exit: (code: number) => void child.emit("exit", code),
      kill: () => {
        child.killed = true;
        if (obeys) {
          setImmediate(() => child.exit(1));
        }
      },
    });
    made.push(child);
    return child as unknown as ServerProcess;
  };
  return { spawn, made };
}

/**
 * Waits for the timers and callbacks queued now to run.
 * @param ms How long, in ms.
 * @returns Once they ran.
 */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Starts a server that keeps stopping by itself, and checks it is started again up to the limit, each start and stop
// written to its log, and then it gives up once, saying so.
test("Desktop: a server that keeps stopping is started again a few times, then given up", async () => {
  const { spawn, made } = processes();
  const lines: string[] = [];
  let gaveUp = 0;
  superviseServer({ spawn, log: (line) => lines.push(line), restartDelayMs: 1, restartLimit: 2, onGiveUp: () => gaveUp++ });
  for (let start = 0; start < 3; start++) {
    made[start].exit(1);
    await wait(10);
  }
  assert.equal(made.length, 3);
  assert.equal(gaveUp, 1);
  assert.equal(lines.filter((line) => line.endsWith("Starting the server.\n")).length, 3);
  assert.match(lines.at(-1)!, /The server stopped 3 times in a row; it stays off until the app starts it again\.\n$/);
});

// Stops a running server and checks the stop settles only once it has exited, without starting it again or giving up;
// a server stopped already settles at once.
test("Desktop: stopping the server settles once it has exited", async () => {
  const { spawn, made } = processes();
  let gaveUp = false;
  const stop = superviseServer({ spawn, log: () => {}, restartDelayMs: 1, restartLimit: 5, onGiveUp: () => (gaveUp = true) });
  let settled = false;
  const stopping = stop().then(() => (settled = true));
  assert.equal(made[0].killed, true);
  assert.equal(settled, false);
  await stopping;
  await wait(10);
  assert.deepEqual([made.length, gaveUp], [1, false]);
  await stop();
});

// Stops a server that doesn't exit when killed, and checks the stop still settles after its timeout.
test("Desktop: stopping a server that doesn't exit settles after the timeout", async () => {
  const { spawn } = processes(false);
  const stop = superviseServer({ spawn, log: () => {}, restartDelayMs: 1, restartLimit: 5, onGiveUp: () => {} });
  const started = Date.now();
  await stop(30);
  assert.ok(Date.now() - started >= 25);
});
