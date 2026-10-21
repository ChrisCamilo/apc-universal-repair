import assert from "node:assert/strict";
import { test } from "node:test";
import { watchServer } from "./server.ts";

/**
 * Waits for the timers queued now to run.
 * @param ms How long, in ms.
 * @returns Once they ran.
 */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Watches a server that answers, misses once, answers again and then misses twice, and checks it is called gone only
// after two misses in a row, once, and isn't asked again after.
test("Desktop: a server the app didn't start is gone after two missed answers in a row", async () => {
  const answers = [true, false, true, false, false, true];
  let asked = 0;
  let gone = 0;
  watchServer(async () => answers[asked++] ?? true, () => gone++, 2);
  await wait(60);
  assert.deepEqual([asked, gone], [5, 1]);
});

// Watches a server and stops watching, and checks it isn't asked again.
test("Desktop: a server's watch stops when asked", async () => {
  let asked = 0;
  const stop = watchServer(async () => (asked++, false), () => {}, 2);
  stop();
  await wait(20);
  assert.equal(asked, 0);
});
