import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { mkdirSync } from "node:fs";
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
  sqliteFileState,
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
  writeConfig(folder, { apiUrl: "http://localhost:3333" });
  const config = adoptInstallerChoice(folder);
  assert.deepEqual(config, { apiUrl: "http://localhost:3333", database: "postgresql" });
  assert.deepEqual(JSON.parse(readFileSync(path.join(folder, "config.json"), "utf8")), config);
  assert.equal(existsSync(path.join(folder, INSTALLER_CHOICE_FILE)), false);
});

// Leaves a choice when config.json holds one already, one that isn't a choice, and none, and checks config.json keeps
// what it had in each case.
test("Desktop: a choice already made, or one that isn't a choice, is kept as it is", () => {
  const made = userData("sqlite");
  writeConfig(made, { database: "postgresql" });
  assert.deepEqual(adoptInstallerChoice(made), { database: "postgresql" });
  assert.deepEqual(readConfig(made), { database: "postgresql" });
  assert.equal(existsSync(path.join(made, INSTALLER_CHOICE_FILE)), false);
  assert.deepEqual(adoptInstallerChoice(userData("mysql")), {});
  const none = userData();
  writeConfig(none, { apiUrl: "http://localhost:3333" });
  assert.deepEqual(adoptInstallerChoice(none), { apiUrl: "http://localhost:3333" });
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

/**
 * Leaves a SQLite file in a userData folder's data folder.
 * @param folder The userData folder.
 * @param content What the file starts with.
 */
function sqliteFile(folder: string, content: string | Buffer) {
  mkdirSync(path.join(folder, "data"), { recursive: true });
  writeFileSync(path.join(folder, "data", "apc.db"), content);
}

// Makes the SQLite key on a first start, and checks it is 64 hex digits, sealed in config.json and not in plain text,
// with its recovery copy still to be kept; the next start gets the same key, and keeps the other settings.
test("Desktop: the SQLite key is made once and kept sealed in config.json", () => {
  const folder = userData();
  writeConfig(folder, { database: "sqlite" });
  const made = ensureSqliteKey(folder, SEALER);
  assert.ok("key" in made);
  assert.match(made.key, /^[0-9a-f]{64}$/);
  const config = readConfig(folder);
  assert.equal(readFileSync(path.join(folder, "config.json"), "utf8").includes(made.key), false);
  assert.deepEqual({ ...config, sqliteKey: "sealed" }, { database: "sqlite", sqliteKey: "sealed", sqliteKeySaved: false });
  assert.equal(recoveryKeyPending(config), true);
  assert.deepEqual(ensureSqliteKey(folder, SEALER), made);
  assert.equal(recoveryKeyPending({ ...config, sqliteKeySaved: true }), false);
  assert.equal(recoveryKeyPending({}), false);
});

// Checks a key this Windows user can't open isn't replaced by a new one, which wouldn't open the file either.
test("Desktop: a SQLite key that can't be opened is kept, not replaced", () => {
  const folder = userData();
  const sealed = seal("1f".repeat(32), SEALER);
  writeConfig(folder, { sqliteKey: sealed });
  const refusing: Sealer = { ...SEALER, decryptString: () => assert.fail("Not this Windows user's.") };
  assert.deepEqual(ensureSqliteKey(folder, refusing), { problem: "unreadable" });
  assert.deepEqual(readConfig(folder), { sqliteKey: sealed });
});

// Leaves an encrypted file with no key in config.json, as a config.json written from a copy read before the key was
// made left it, and checks no key is made in its place; a plain file, from before files were encrypted, gets one.
test("Desktop: a file already encrypted without its key gets no new one", () => {
  const encrypted = userData();
  sqliteFile(encrypted, Buffer.from("8c1f0e6a9b2d4c7f8e1a3b5c7d9e0f12", "hex"));
  writeConfig(encrypted, { database: "sqlite", trayNoticeShown: true });
  assert.deepEqual(ensureSqliteKey(encrypted, SEALER), { problem: "missing" });
  assert.deepEqual(readConfig(encrypted), { database: "sqlite", trayNoticeShown: true });

  const plain = userData();
  sqliteFile(plain, "SQLite format 3\0 e o resto do arquivo");
  assert.ok("key" in ensureSqliteKey(plain, SEALER));
});

// Reads the first bytes of a missing file, an empty one, a plain SQLite file and an encrypted one.
test("Desktop: the SQLite file is told new, plain or encrypted from its first bytes", () => {
  const folder = userData();
  const file = path.join(folder, "data", "apc.db");
  assert.equal(sqliteFileState(file), "new");
  sqliteFile(folder, "");
  assert.equal(sqliteFileState(file), "new");
  sqliteFile(folder, "SQLite format 3\0");
  assert.equal(sqliteFileState(file), "plain");
  sqliteFile(folder, "SQLite");
  assert.equal(sqliteFileState(file), "encrypted");
  sqliteFile(folder, Buffer.from("8c1f0e6a9b2d4c7f8e1a3b5c7d9e0f12", "hex"));
  assert.equal(sqliteFileState(file), "encrypted");
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
