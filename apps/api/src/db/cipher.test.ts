import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import Database from "better-sqlite3";
import { WRONG_KEY_EXIT_CODE } from "@apc/shared/server";
import { changeKey, ensureEncrypted, keyOpens, keyScript, readKey, REKEY_COPY, setSqliteKey } from "./cipher.js";
import { createPrisma } from "./client.js";
import { migrate, migrationNames } from "./migrate.js";
import { API_DIR } from "./provider.js";

// The SQLite file encrypted at rest, on files in a temporary folder, so it runs without a database server: what an
// encrypted file shows without its key, the migrations on it, a plain file encrypted in place, and the server refusing
// a key that doesn't open its file.

/** This run's folder, removed at the end. */
const FOLDER = mkdtempSync(path.join(tmpdir(), "apc-cipher-"));
/** A key, as the desktop app makes it. */
const KEY = "1f".repeat(32);
/** Another key, which doesn't open a file encrypted with KEY. */
const OTHER_KEY = "2e".repeat(32);

after(() => rmSync(FOLDER, { recursive: true, force: true }));

/**
 * Names a file of this run.
 * @param name The file's name.
 * @returns Its DATABASE_URL.
 */
function fileUrl(name: string): string {
  return `file:${path.join(FOLDER, `${name}.db`)}`;
}

/**
 * Tries to read a file's tables with a key, or with none.
 * @param url The file's DATABASE_URL.
 * @param key The key to send, if any.
 * @returns The table names, or the error's message.
 */
function readTables(url: string, key?: string): string[] | string {
  const db = new Database(url.slice("file:".length));
  try {
    if (key) {
      db.exec(keyScript(key));
    }
    return (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((row) => row.name);
  } catch (error) {
    return (error as Error).message;
  } finally {
    db.close();
  }
}

// Migrates a new file with a key, and checks its text isn't in the file, it reads neither without the key nor with
// another one, and it reads with its own, through the runner and the API's client.
test("API: an encrypted SQLite file can't be read without its key or with another one", async () => {
  const url = fileUrl("encrypted");
  setSqliteKey(url, KEY);
  await migrate(url);
  assert.equal(readFileSync(url.slice("file:".length)).includes("_prisma_migrations"), false);
  assert.equal(readTables(url), "file is not a database");
  assert.equal(readTables(url, OTHER_KEY), "file is not a database");
  assert.ok((readTables(url, KEY) as string[]).includes("Item"));
  const client = createPrisma(url);
  try {
    assert.equal(await client.item.count(), 0);
  } finally {
    await client.$disconnect();
  }
});

// Migrates an encrypted file twice, and checks every migration is applied once, in order, and the second run applies
// none.
test("API: the runner applies the migrations once, in order, on an encrypted file", async () => {
  const url = fileUrl("migrated");
  setSqliteKey(url, KEY);
  const applied: string[] = [];
  await migrate(url, (name) => applied.push(name));
  assert.deepEqual(applied, migrationNames("sqlite"));
  assert.deepEqual(await migrate(url), []);
});

// Fills a plain file in WAL mode, as the server leaves it, then gives it a key, and checks the start encrypts it in
// place, keeping every row, removing the backup copy, and that a second start leaves it as it is.
test("API: a plain file is encrypted in place on start, keeping every row", async () => {
  const url = fileUrl("plain");
  await migrate(url);
  const plain = createPrisma(url);
  await plain.$queryRawUnsafe("PRAGMA journal_mode = WAL");
  await plain.category.create({ data: { name: "Motor", nameKey: "motor" } });
  await plain.category.create({ data: { name: "Freios", nameKey: "freios" } });
  await plain.$disconnect();
  assert.ok((readTables(url) as string[]).includes("Category"), "plain before the key");

  setSqliteKey(url, KEY);
  assert.equal(ensureEncrypted(url), "encrypted");
  assert.equal(existsSync(`${url.slice("file:".length)}.before-encryption`), false);
  assert.equal(readFileSync(url.slice("file:".length)).includes("Freios"), false);
  assert.equal(readTables(url), "file is not a database");
  const encrypted = createPrisma(url);
  try {
    assert.deepEqual((await encrypted.category.findMany({ orderBy: { name: "asc" } })).map((category) => category.name), ["Freios", "Motor"]);
  } finally {
    await encrypted.$disconnect();
  }
  assert.equal(ensureEncrypted(url), "unchanged");
});

// Starts the server on a file encrypted with one key, giving it another, and checks it stops at once with the wrong
// key's exit code, saying the key doesn't open the file, without listening.
test("API: a key that doesn't open the file stops the server with its message", async () => {
  const url = fileUrl("wrong-key");
  setSqliteKey(url, KEY);
  await migrate(url);
  const run = spawnSync("pnpm", ["exec", "tsx", "src/server.ts"], {
    cwd: API_DIR,
    env: { ...process.env, DATABASE_URL: url, APC_SQLITE_KEY: OTHER_KEY, PORT: "0" },
    shell: true,
    encoding: "utf8",
    timeout: 60_000,
  });
  assert.equal(run.status, WRONG_KEY_EXIT_CODE, run.stdout + run.stderr);
  assert.match(run.stdout + run.stderr, /doesn't open with its key/);
});

// Checks a file opens with the key a task gives for it, not with another one, and that a file that isn't there opens
// with none.
test("API: a key is told whether it opens a file", async () => {
  const url = fileUrl("key-opens");
  assert.equal(keyOpens(url), false);
  setSqliteKey(url, KEY);
  await migrate(url);
  assert.equal(keyOpens(url), true);
  setSqliteKey(url, OTHER_KEY);
  assert.equal(keyOpens(url), false);
});

// Changes the key of a migrated file, and checks it opens with the new key and not the old one, with every row kept
// and no copy left beside it; a change to a key that isn't one fails, and leaves the file opening with its old key.
test("API: a file's key changes, or stays as it was when the change fails", async () => {
  const url = fileUrl("rekey");
  setSqliteKey(url, KEY);
  await migrate(url);
  const tables = readTables(url, KEY);
  const file = url.slice("file:".length);

  changeKey(url, OTHER_KEY);
  assert.deepEqual(readTables(url, OTHER_KEY), tables);
  assert.match(String(readTables(url, KEY)), /not a database/);
  assert.equal(existsSync(`${file}${REKEY_COPY}`), false);

  setSqliteKey(url, OTHER_KEY);
  assert.throws(() => changeKey(url, "não é uma chave"), /64 hex digits/);
  assert.deepEqual(readTables(url, OTHER_KEY), tables);
  assert.equal(existsSync(`${file}${REKEY_COPY}`), false);
  setSqliteKey(url, KEY);
  assert.throws(() => changeKey(url, OTHER_KEY), /doesn't open with its key/);
});

// Reads keys typed back from a recovery copy, grouped, in uppercase or with spaces, and refuses what isn't one.
test("API: a recovery key is read back however it is grouped", () => {
  assert.equal(readKey(KEY), KEY);
  assert.equal(readKey(KEY.toUpperCase().match(/.{8}/g)!.join("-")), KEY);
  assert.equal(readKey(` ${KEY.match(/.{4}/g)!.join(" ")} `), KEY);
  assert.equal(readKey("1f1f"), undefined);
  assert.equal(readKey(`${KEY.slice(0, 63)}g`), undefined);
});
