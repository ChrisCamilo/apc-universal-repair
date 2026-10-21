import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  checksForUpdates,
  clearInstallMarker,
  INSTALL_MARKER,
  INSTALL_WINDOW_MS,
  installInProgress,
  readInstallMarker,
  RESTART_TO_UPDATE_CHANNEL,
  serverVersionWarning,
  UPDATE_READY_CHANNEL,
  writeInstallMarker,
} from "./update.ts";

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

// Writes the marker of an update to 0.5.2 and checks an app of 0.5.1 opening in the next minutes leaves the folder to
// the installer, but not 0.5.2 itself, nor any app once the install window has passed, nor one with no marker.
test("Desktop: an app opened while its update installs leaves it to the installer", () => {
  const startedAt = Date.parse("2026-10-21T12:00:00Z");
  const marker = { version: "0.5.2", startedAt, reopens: true };
  assert.equal(installInProgress(marker, "0.5.1", startedAt + 20_000), true);
  assert.equal(installInProgress(marker, "0.5.2", startedAt + 20_000), false);
  assert.equal(installInProgress(marker, "0.5.1", startedAt + INSTALL_WINDOW_MS), false);
  assert.equal(installInProgress(undefined, "0.5.1", startedAt), false);
});

// Writes the marker, reads it back and clears it, and checks a marker that isn't JSON or lacks its fields reads as none.
test("Desktop: the update's marker is kept in userData until it is cleared", () => {
  const userData = mkdtempSync(path.join(tmpdir(), "apc-update-"));
  try {
    const marker = { version: "0.5.2", startedAt: 1_792_000_000_000, reopens: false };
    writeInstallMarker(userData, marker);
    assert.deepEqual(readInstallMarker(userData), marker);
    clearInstallMarker(userData);
    assert.equal(readInstallMarker(userData), undefined);
    writeFileSync(path.join(userData, INSTALL_MARKER), "{ quebrado");
    assert.equal(readInstallMarker(userData), undefined);
    writeFileSync(path.join(userData, INSTALL_MARKER), '{ "version": "0.5.2" }');
    assert.equal(readInstallMarker(userData), undefined);
  } finally {
    rmSync(userData, { recursive: true, force: true });
  }
});

// Checks the warning names both versions, or says the server is older than 0.2.0 when it answers none.
test("Desktop: the warning about a remote server names both versions", () => {
  assert.equal(
    serverVersionWarning("0.2.1", "0.2.0"),
    "O servidor APC está na versão 0.2.0, e este app na 0.2.1. Atualize o servidor no computador onde ele roda para evitar erros.",
  );
  assert.match(serverVersionWarning("0.2.1", undefined), /numa versão anterior à 0\.2\.0, e este app na 0\.2\.1/);
});
