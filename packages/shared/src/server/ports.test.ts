import assert from "node:assert/strict";
import { test } from "node:test";
import { DEV_SERVER_PORT, PORT_IN_USE_EXIT_CODE, SERVER_PORT } from "./ports.ts";

// Checks the development API listens on 3333 and the finished server on 3000, apart from each other.
test("Shared: the development API and the finished server listen on ports of their own", () => {
  assert.deepEqual([DEV_SERVER_PORT, SERVER_PORT], [3333, 3000]);
});

// Checks a taken port has an exit code of its own, apart from a plain failure's 1.
test("Shared: a server whose port is taken exits with a code of its own", () => {
  assert.equal(PORT_IN_USE_EXIT_CODE, 98);
});
