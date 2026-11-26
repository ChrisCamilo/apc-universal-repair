import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

// The sandboxed preload can only load Electron's renderer modules, not serverSettings.ts, deviceKey.ts or texts.ts, so
// it writes their channels itself; checks every channel they name is in the preload, the failure, retry and language
// ones included.
test("Desktop: the preload uses the same server channels as the main process", () => {
  const read = (file: string) => readFileSync(path.join(import.meta.dirname, file), "utf8");
  const channels = new Set(`${read("server/serverSettings.ts")}${read("system/deviceKey.ts")}${read("texts.ts")}`.match(/"apc:[a-z-]+"/g));
  const preload = read("preload.cts");
  assert.ok(channels.has('"apc:server-failed"') && channels.has('"apc:server-retry"') && channels.has('"apc:locale"'));
  assert.deepEqual([...channels].filter((channel) => !preload.includes(channel)), []);
});
