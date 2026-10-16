import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { adoptInstallerChoice, envDatabaseUrl, INSTALLER_CHOICE_FILE, serverCanStart } from "./database.ts";

/** A userData folder for each test, removed at the end. */
const folders: string[] = [];

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

// Reads DATABASE_URL from .env texts, quoted or not, among other settings, empty, commented out and missing.
test("Desktop: the API's .env is read for its DATABASE_URL", () => {
  const url = "postgresql://postgres:x@localhost:5432/apc_universal_repair";
  assert.equal(envDatabaseUrl(`PORT=3333\r\nDATABASE_URL="${url}"\r\n`), url);
  assert.equal(envDatabaseUrl("DATABASE_URL=file:./data/apc.db"), "file:./data/apc.db");
  assert.equal(envDatabaseUrl('DATABASE_URL=""'), undefined);
  assert.equal(envDatabaseUrl(`# DATABASE_URL="${url}"`), undefined);
  assert.equal(envDatabaseUrl("PORT=3333"), undefined);
  assert.equal(envDatabaseUrl(undefined), undefined);
});

// Checks the server starts for SQLite, or with no choice, whatever the .env says, and for PostgreSQL only once the
// .env names a database.
test("Desktop: the server starts for PostgreSQL only once the .env names it", () => {
  assert.equal(serverCanStart({ database: "sqlite" }, undefined), true);
  assert.equal(serverCanStart({}, "PORT=3333"), true);
  assert.equal(serverCanStart({ database: "postgresql" }, "PORT=3333"), false);
  assert.equal(serverCanStart({ database: "postgresql" }, undefined), false);
  assert.equal(serverCanStart({ database: "postgresql" }, 'DATABASE_URL="postgresql://localhost/apc"'), true);
});
