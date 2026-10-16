import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { checksForUpdates, RESTART_TO_UPDATE_CHANNEL, serverVersionWarning, UPDATE_READY_CHANNEL } from "./update.ts";

// Checks only the installed app looks for updates: packaged, with no dev server and not as the portable exe.
test("Desktop: only the installed app checks for updates", () => {
  const installed = { isPackaged: true, devUrl: undefined, portableDir: undefined };
  assert.equal(checksForUpdates(installed), true);
  assert.equal(checksForUpdates({ ...installed, isPackaged: false }), false);
  assert.equal(checksForUpdates({ ...installed, devUrl: "http://localhost:5173" }), false);
  assert.equal(checksForUpdates({ ...installed, portableDir: "C:\\Users\\apc\\Downloads" }), false);
});

// The sandboxed preload can't import update.ts, so it writes the channels itself; checks they are the same.
test("Desktop: the preload uses the same update channels as the main process", () => {
  const preload = readFileSync(path.join(import.meta.dirname, "preload.cts"), "utf8");
  assert.ok(preload.includes(`"${RESTART_TO_UPDATE_CHANNEL}"`));
  assert.ok(preload.includes(`"${UPDATE_READY_CHANNEL}"`));
});

// Checks the warning names both versions, or says the server is older than 0.2.0 when it answers none.
test("Desktop: the warning about a remote server names both versions", () => {
  assert.equal(
    serverVersionWarning("0.2.1", "0.2.0"),
    "O servidor APC está na versão 0.2.0, e este app na 0.2.1. Atualize o servidor no computador onde ele roda para evitar erros.",
  );
  assert.match(serverVersionWarning("0.2.1", undefined), /numa versão anterior à 0\.2\.0, e este app na 0\.2\.1/);
});
