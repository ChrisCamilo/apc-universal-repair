import assert from "node:assert/strict";
import { test } from "node:test";
import { DEV_SERVER_PORT, SERVER_PORT } from "./ports.ts";

// Checks the development API listens on 3333 and the finished server on 3000, apart from each other.
test("Shared: the development API and the finished server listen on ports of their own", () => {
  assert.deepEqual([DEV_SERVER_PORT, SERVER_PORT], [3333, 3000]);
});
