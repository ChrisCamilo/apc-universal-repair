import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

// The sandboxed preload can't import serverSettings.ts, which needs Electron's main process, so it writes the server's
// channels itself; checks every channel serverSettings.ts names is in the preload, the failure and retry ones included.
test("Desktop: the preload uses the same server channels as the main process", () => {
  const read = (file: string) => readFileSync(path.join(import.meta.dirname, file), "utf8");
  const channels = new Set(read("server/serverSettings.ts").match(/"apc:[a-z-]+"/g));
  const preload = read("preload.cts");
  assert.ok(channels.has('"apc:server-failed"') && channels.has('"apc:server-retry"'));
  assert.deepEqual([...channels].filter((channel) => !preload.includes(channel)), []);
});
