import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { keepAppLog, openLog } from "./logs.ts";

// Opens a log in a new userData folder, then again once it passed the limit, and checks the folder is made, a small log
// stays where it is and a large one is moved to its .old.log, the new one starting empty.
test("Desktop: a log is moved aside once it passes its limit", () => {
  const userData = mkdtempSync(path.join(tmpdir(), "apc-logs-"));
  try {
    const log = openLog(userData, "api", 10);
    assert.equal(log, path.join(userData, "logs", "api.log"));
    writeFileSync(log, "pequeno");
    openLog(userData, "api", 10);
    assert.equal(readFileSync(log, "utf8"), "pequeno");
    writeFileSync(log, "passou do limite");
    openLog(userData, "api", 10);
    assert.equal(existsSync(log), false);
    assert.equal(readFileSync(path.join(userData, "logs", "api.old.log"), "utf8"), "passou do limite");
  } finally {
    rmSync(userData, { recursive: true, force: true });
  }
});

// Keeps the app's log, writes to the console, and checks each line lands in app.log with its time and level, written
// out as the console writes it, and still reaches the console.
test("Desktop: the main process's console is kept in app.log", (t) => {
  const userData = mkdtempSync(path.join(tmpdir(), "apc-logs-"));
  const original = { log: console.log, info: console.info, warn: console.warn, error: console.error };
  const shown: unknown[][] = [];
  console.log = console.info = console.warn = console.error = (...args: unknown[]) => void shown.push(args);
  t.after(() => {
    Object.assign(console, original);
    rmSync(userData, { recursive: true, force: true });
  });
  const log = keepAppLog(userData);
  console.log("API: %s", "http://127.0.0.1:3000");
  console.warn("The bundled server didn't answer in time.");
  const lines = readFileSync(log, "utf8").trimEnd().split("\n");
  assert.match(lines[0], /^\d{4}-\d{2}-\d{2}T[\d:.]+Z LOG API: http:\/\/127\.0\.0\.1:3000$/);
  assert.match(lines[1], /Z WARN The bundled server didn't answer in time\.$/);
  assert.equal(shown.length, 2);
});
