import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { readConfig, writeConfig } from "./config.ts";
import {
  adoptInstallerChoice,
  databaseCheckMessage,
  describePostgresql,
  ensureSqliteKey,
  formatRecoveryKey,
  importProblemMessage,
  INSTALLER_CHOICE_FILE,
  isPostgresqlUrl,
  needsDatabaseAddress,
  oldPhotosFolder,
  openDatabaseUrl,
  readRecoveryKey,
  recoveryKeyPending,
  seal,
  type Sealer,
} from "./database.ts";

/** A PostgreSQL address with a password, as the settings take it. */
const ADDRESS = "postgresql://postgres:freio-1234@localhost:5432/apc_universal_repair";
/** A userData folder for each test, removed at the end. */
const folders: string[] = [];
/** A stand-in for safeStorage, which only Electron has: it flips every byte, so the text can't be read as it is. */
const SEALER: Sealer = {
  encryptString: (text) => Buffer.from(Buffer.from(text, "utf8").map((byte) => byte ^ 0xff)),
  decryptString: (sealed) => Buffer.from(sealed.map((byte) => byte ^ 0xff)).toString("utf8"),
};

after(() => folders.forEach((folder) => rmSync(folder, { recursive: true, force: true })));

/**
 * Makes an empty userData folder, with the installer's file when given.
 * @param choice What the installer left, if anything.
 * @returns The folder.
 */
function userData(choice?: string): string {
  const folder = mkdtempSync(path.join(tmpdir(), "apc-desktop-db-"));
  folders.push(folder);
  if (choice !== undefined) {
    writeFileSync(path.join(folder, INSTALLER_CHOICE_FILE), choice);
  }
  return folder;
}

// Leaves the installer's PostgreSQL choice next to a config.json with an API address, and checks the app moves it in,
// keeping the address, and removes the installer's file.
test("Desktop: the installer's choice moves into config.json", () => {
  const folder = userData("postgresql\r\n");
  const config = adoptInstallerChoice(folder, { apiUrl: "http://localhost:3333" });
  assert.deepEqual(config, { apiUrl: "http://localhost:3333", database: "postgresql" });
  assert.deepEqual(JSON.parse(readFileSync(path.join(folder, "config.json"), "utf8")), config);
  assert.equal(existsSync(path.join(folder, INSTALLER_CHOICE_FILE)), false);
});

// Leaves a choice when config.json holds one already, one that isn't a choice, and none, and checks config.json keeps
// what it had in each case, writing nothing.
test("Desktop: a choice already made, or one that isn't a choice, is kept as it is", () => {
  const made = userData("sqlite");
  assert.deepEqual(adoptInstallerChoice(made, { database: "postgresql" }), { database: "postgresql" });
  assert.equal(existsSync(path.join(made, "config.json")), false);
  assert.equal(existsSync(path.join(made, INSTALLER_CHOICE_FILE)), false);
  assert.deepEqual(adoptInstallerChoice(userData("mysql"), {}), {});
  assert.deepEqual(adoptInstallerChoice(userData(), { apiUrl: "http://localhost:3333" }), { apiUrl: "http://localhost:3333" });
});

// Seals PostgreSQL's address into config.json, and checks the file holds neither the address nor its password, and the
// address opens back from it.
test("Desktop: PostgreSQL's address is kept sealed, never in plain text in config.json", () => {
  const folder = userData();
  writeConfig(folder, { database: "postgresql", databaseUrl: seal(ADDRESS, SEALER) });
  const text = readFileSync(path.join(folder, "config.json"), "utf8");
  assert.equal(text.includes(ADDRESS), false);
  assert.equal(text.includes("freio-1234"), false);
  assert.equal(JSON.parse(text).database, "postgresql", "the choice, which isn't secret");
  assert.equal(openDatabaseUrl(JSON.parse(text), SEALER), ADDRESS);
});

// Checks the address is asked for when PostgreSQL was chosen with no address, or one this Windows user can't open, and
// not once one opens, nor for SQLite.
test("Desktop: the app asks for PostgreSQL's address until it has one it can open", () => {
  const refusing: Sealer = { ...SEALER, decryptString: () => assert.fail("Not this Windows user's.") };
  const sealed = seal(ADDRESS, SEALER);
  assert.equal(needsDatabaseAddress({ database: "postgresql" }, SEALER), true);
  assert.equal(needsDatabaseAddress({ database: "postgresql", databaseUrl: sealed }, refusing), true);
  assert.equal(needsDatabaseAddress({ database: "postgresql", databaseUrl: sealed }, SEALER), false);
  assert.equal(needsDatabaseAddress({ database: "sqlite" }, SEALER), false);
  assert.equal(needsDatabaseAddress({}, SEALER), false);
});

// Checks which typed addresses count as PostgreSQL's, and that the settings show one without its user and password.
test("Desktop: PostgreSQL's address is checked, and shown without its password", () => {
  assert.equal(isPostgresqlUrl(ADDRESS), true);
  assert.equal(isPostgresqlUrl("postgres://apc@192.168.0.10/apc"), true);
  assert.equal(isPostgresqlUrl("localhost:5432"), false);
  assert.equal(isPostgresqlUrl("http://localhost:5432/apc"), false);
  assert.equal(isPostgresqlUrl("file:./data/apc.db"), false);
  assert.equal(describePostgresql(ADDRESS), "localhost:5432/apc_universal_repair");
});

// Checks a database of a newer version and one of another app are refused, saying why, and an empty one or one of
// this version or before is taken.
test("Desktop: the server moves only onto an empty database or one of its own", () => {
  assert.match(databaseCheckMessage({ missing: [], newer: ["20991231000000_next"], foreign: false }) ?? "", /versão mais nova/);
  assert.match(databaseCheckMessage({ missing: ["20260101000000_init"], newer: [], foreign: true }) ?? "", /outro programa/);
  assert.equal(databaseCheckMessage({ missing: ["20260101000000_init"], newer: [], foreign: false }), undefined);
  assert.equal(databaseCheckMessage({ missing: [], newer: [], foreign: false }), undefined);
});

// Checks each reason an import can't start has its message, and the old photos folder is found from a clone's file.
test("Desktop: an import says why it can't start, and finds the clone's photos", () => {
  for (const problem of ["sourceBehind", "sourceNewer", "sourceNotApc", "targetHasData"] as const) {
    assert.ok(importProblemMessage(problem).length > 0, problem);
  }
  assert.equal(
    oldPhotosFolder(path.join("C:", "APC", "apps", "api", "data", "apc.db")),
    path.join("C:", "APC", "apps", "api", "uploads", "photos"),
  );
});

// Makes the SQLite key on a first start, and checks it is 64 hex digits, sealed in config.json and not in plain text,
// with its recovery copy still to be kept; the next start gets the same key, and keeps the other settings.
test("Desktop: the SQLite key is made once and kept sealed in config.json", () => {
  const folder = userData();
  const key = ensureSqliteKey(folder, { database: "sqlite" }, SEALER)!;
  assert.match(key, /^[0-9a-f]{64}$/);
  const config = readConfig(folder);
  assert.equal(readFileSync(path.join(folder, "config.json"), "utf8").includes(key), false);
  assert.deepEqual({ ...config, sqliteKey: "sealed" }, { database: "sqlite", sqliteKey: "sealed", sqliteKeySaved: false });
  assert.equal(recoveryKeyPending(config), true);
  assert.equal(ensureSqliteKey(folder, config, SEALER), key);
  assert.equal(recoveryKeyPending({ ...config, sqliteKeySaved: true }), false);
  assert.equal(recoveryKeyPending({}), false);
});

// Checks a key this Windows user can't open isn't replaced by a new one, which wouldn't open the file either.
test("Desktop: a SQLite key that can't be opened is kept, not replaced", () => {
  const folder = userData();
  const sealed = seal("1f".repeat(32), SEALER);
  const refusing: Sealer = { ...SEALER, decryptString: () => assert.fail("Not this Windows user's.") };
  assert.equal(ensureSqliteKey(folder, { sqliteKey: sealed }, refusing), undefined);
  assert.equal(existsSync(path.join(folder, "config.json")), false);
});

// Writes a key as its recovery copy, and checks it reads back as typed: grouped, in lowercase or with spaces; text that
// isn't a key is refused.
test("Desktop: the recovery copy of the key reads back however it is typed", () => {
  const key = "0123456789abcdef".repeat(4);
  const copy = formatRecoveryKey(key);
  assert.equal(copy, "01234567-89ABCDEF-01234567-89ABCDEF-01234567-89ABCDEF-01234567-89ABCDEF");
  assert.equal(readRecoveryKey(copy), key);
  assert.equal(readRecoveryKey(copy.toLowerCase().replaceAll("-", " ")), key);
  assert.equal(readRecoveryKey("01234567-89ABCDEF"), undefined);
  assert.equal(readRecoveryKey(copy.replace("0", "G")), undefined);
});
