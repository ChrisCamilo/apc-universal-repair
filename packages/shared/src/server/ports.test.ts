import assert from "node:assert/strict";
import { test } from "node:test";
import { DEV_SERVER_PORT, LOCAL_HOST, NETWORK_HOST, PORT_IN_USE_EXIT_CODE, SERVER_PORT, WRONG_KEY_EXIT_CODE } from "./ports.ts";

// Checks the development API listens on 3333 and the finished server on 3000, apart from each other.
test("Shared: the development API and the finished server listen on ports of their own", () => {
  assert.deepEqual([DEV_SERVER_PORT, SERVER_PORT], [3333, 3000]);
});

// Checks a server only this computer reaches listens on IPv4's loopback, and one the network reaches on every address.
test("Shared: a server listens on the loopback, or on every address for the network", () => {
  assert.deepEqual([LOCAL_HOST, NETWORK_HOST], ["127.0.0.1", "0.0.0.0"]);
});

// Checks a taken port and a wrong SQLite key each have an exit code of their own, apart from a plain failure's 1.
test("Shared: a server whose port is taken or whose key is wrong exits with a code of its own", () => {
  assert.deepEqual([PORT_IN_USE_EXIT_CODE, WRONG_KEY_EXIT_CODE], [98, 97]);
});
