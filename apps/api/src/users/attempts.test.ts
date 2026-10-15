import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { ATTEMPT_WINDOW_MS, createLimiter } from "./attempts.js";

beforeEach(() => {
  mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-15T12:00:00Z") });
});

afterEach(() => {
  mock.timers.reset();
});

// Counts three attempts on a limit of three and checks the key waits for the rest of the window from its first
// attempt, while another key doesn't; once the window ends, the key starts a new one.
test("API: a key waits once it reaches its limit, until its window ends", () => {
  const limiter = createLimiter(3);
  limiter.count("ana");
  mock.timers.tick(60 * 1000);
  limiter.count("ana");
  assert.equal(limiter.wait("ana"), 0);
  limiter.count("ana");
  assert.equal(limiter.wait("ana"), ATTEMPT_WINDOW_MS - 60 * 1000);
  assert.equal(limiter.wait("bia"), 0);

  mock.timers.tick(ATTEMPT_WINDOW_MS - 60 * 1000);
  assert.equal(limiter.wait("ana"), 0);
  limiter.count("ana");
  assert.equal(limiter.wait("ana"), 0);
});

// Counts a key up to its limit, clears it, and checks it starts from nothing.
test("API: clearing a key forgets its attempts", () => {
  const limiter = createLimiter(2);
  limiter.count("ana");
  limiter.count("ana");
  assert.ok(limiter.wait("ana") > 0);
  limiter.clear("ana");
  assert.equal(limiter.wait("ana"), 0);
  limiter.count("ana");
  assert.equal(limiter.wait("ana"), 0);
});
