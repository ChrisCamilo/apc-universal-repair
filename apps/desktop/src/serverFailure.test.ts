import assert from "node:assert/strict";
import { test } from "node:test";
import { lastServerError, serverFailure } from "./serverFailure.ts";

const LOG = "C:\\Users\\ana\\AppData\\Roaming\\APC Universal Repair\\logs\\api.log";

// Reads logs where the server wrote a JSON error, crashed with a plain error, or only started, and checks the last
// error since its last start is found, an error of an earlier start is left out, and a line cut short is skipped.
test("Desktop: the last error the server wrote since it started is found", () => {
  const earlier = '{"level":50,"msg":"antigo"}\n2026-10-21T12:00:00.000Z The server stopped (exit code 1).';
  const json = [
    earlier,
    "2026-10-21T12:00:05.000Z Starting the server.",
    '{"level":30,"msg":"Encrypted the SQLite file with its key."}',
    '{"level":50,"err":{"type":"Error","message":"file is not a database"},"msg":"file is not a database"}',
    '{"level":30,"msg":"cortad',
    "2026-10-21T12:00:06.000Z The server stopped (exit code 1).",
  ].join("\n");
  assert.equal(lastServerError(json), "file is not a database");
  const crash = "2026-10-21T12:00:05.000Z Starting the server.\r\nnode:internal/modules\r\nError: Cannot find module 'better-sqlite3'\r\n";
  assert.equal(lastServerError(crash), "Error: Cannot find module 'better-sqlite3'");
  assert.equal(lastServerError(`${earlier}\n2026-10-21T12:00:05.000Z Starting the server.\n`), undefined);
});

// Words each failure, and checks the stops and the timeout name the last error when there is one, the key doesn't, and
// each gives the log to look at.
test("Desktop: a server that isn't on says why, with its log", () => {
  const log = "2026-10-21T12:00:05.000Z Starting the server.\nError: listen EADDRINUSE: address already in use 127.0.0.1:3000";
  assert.deepEqual(serverFailure("stopped", log, LOG), {
    kind: "stopped",
    reason: "O servidor parou ao ligar, várias vezes seguidas. Último erro: Error: listen EADDRINUSE: address already in use 127.0.0.1:3000",
    log: LOG,
  });
  assert.equal(serverFailure("timeout", "", LOG).reason, "O servidor não respondeu a tempo.");
  assert.equal(serverFailure("key", log, LOG).reason, "A chave do banco SQLite guardada neste computador não abre com este usuário do Windows.");
});

// Words a taken port, and checks it names the program and its process when the system says which, and otherwise only
// that another program holds it, each saying what to do, with no error from the log.
test("Desktop: a taken port names the program holding it", () => {
  const log = "2026-10-21T12:00:05.000Z Starting the server.\nError: listen EADDRINUSE: address already in use 0.0.0.0:3000";
  assert.deepEqual(serverFailure("portInUse", log, LOG, { port: 3000, owner: { pid: 4321, name: "node.exe" } }), {
    kind: "portInUse",
    reason: "A porta 3000 já está em uso pelo programa node.exe (processo 4321). Feche esse programa e tente de novo, ou use outra porta.",
    log: LOG,
  });
  assert.equal(
    serverFailure("portInUse", log, LOG, { port: 3000 }).reason,
    "A porta 3000 já está em uso por outro programa. Feche esse programa e tente de novo, ou use outra porta.",
  );
});
