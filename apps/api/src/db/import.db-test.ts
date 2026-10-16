import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, afterEach, before, test } from "node:test";
import Database from "better-sqlite3";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createPrisma, prisma } from "./client.js";
import { copyDatabase, TABLES } from "./copy.js";
import { importProblem, importServer } from "./import.js";
import { migrate, migrationsFolder } from "./migrate.js";

// Importing an old server into the desktop app's (`pnpm --filter @apc/api test:db`): the seeded database of
// DATABASE_URL, with a photo whose files are in an old photos folder, copied to an old SQLite file or, when
// TEST_POSTGRES_URL names a PostgreSQL server whose user can create databases, an old PostgreSQL database, and imported
// from there into a new SQLite file. Every database and folder is made here and removed at the end.

/** A folder for this run's databases and photos. */
const FOLDER = mkdtempSync(path.join(tmpdir(), "apc-import-"));
/** The old server's photos folder. */
const OLD_PHOTOS = path.join(FOLDER, "old-photos");
/** The photo row this run adds to the seeded database. */
const PHOTO_ID = `00000000-0000-4000-8000-${randomBytes(6).toString("hex")}`;
/** The clients this run opens, closed at the end. */
const opened: PrismaClient[] = [];

before(async () => {
  const item = (await prisma.item.findFirst({ where: { photos: { none: {} } }, orderBy: { code: "asc" } }))!;
  await prisma.itemPhoto.create({ data: { id: PHOTO_ID, itemId: item.id, position: 0, file: `${PHOTO_ID}.webp`, thumbFile: `${PHOTO_ID}-thumb.webp` } });
  mkdirSync(OLD_PHOTOS, { recursive: true });
  writeFileSync(path.join(OLD_PHOTOS, `${PHOTO_ID}.webp`), "photo");
  writeFileSync(path.join(OLD_PHOTOS, `${PHOTO_ID}-thumb.webp`), "thumbnail");
});

after(async () => {
  await prisma.itemPhoto.deleteMany({ where: { id: PHOTO_ID } });
  await Promise.all([prisma, ...opened].map((client) => client.$disconnect()));
  rmSync(FOLDER, { recursive: true, force: true });
});

afterEach(() => {
  delete process.env.APC_MIGRATIONS_DIR;
});

/**
 * Checks an import from an old database into a new SQLite file: every row of the seeded database is there, and the
 * photo's two files are in the new photos folder.
 * @param from The old database, holding the seeded data.
 * @param name The new file's name.
 */
async function checkImport(from: string, name: string): Promise<void> {
  const to = await migratedFile(name);
  const photosTo = path.join(FOLDER, `${name}-photos`);
  assert.equal(await importProblem(from, to), undefined);
  const result = await importServer({ from, to, photosFrom: OLD_PHOTOS, photosTo });
  assert.ok(Object.values(result.tables).every((count) => count.source === count.target));
  assert.equal(result.photos.copied, 2);
  assert.deepEqual(await rowsOf(open(to)), await rowsOf(prisma));
  assert.equal(readFileSync(path.join(photosTo, `${PHOTO_ID}.webp`), "utf8"), "photo");
  assert.equal(readFileSync(path.join(photosTo, `${PHOTO_ID}-thumb.webp`), "utf8"), "thumbnail");
}

/**
 * Makes a new SQLite file with every migration applied.
 * @param name The file's name.
 * @returns Its DATABASE_URL.
 */
async function migratedFile(name: string): Promise<string> {
  const url = `file:${path.join(FOLDER, `${name}.db`)}`;
  await migrate(url);
  return url;
}

/**
 * Opens a database, closed at the end of the run.
 * @param url Its DATABASE_URL.
 * @returns Its client.
 */
function open(url: string): PrismaClient {
  return opened[opened.push(createPrisma(url)) - 1];
}

/**
 * Reads every copied table of a database, each row by id, with its dates as ISO text, so two databases compare.
 * @param client The database.
 * @returns The rows, by table.
 */
async function rowsOf(client: PrismaClient): Promise<Record<string, unknown[]>> {
  const tables = await Promise.all(
    TABLES.map(async (name) => {
      const rows = (await (client[name] as unknown as { findMany: () => Promise<{ id: string }[]> }).findMany()).sort((a, b) =>
        a.id < b.id ? -1 : 1,
      );
      return [name, JSON.parse(JSON.stringify(rows))] as const;
    }),
  );
  return Object.fromEntries(tables);
}

// Puts the seeded data in an old SQLite file, as an old clone's apps\api\data\apc.db, imports it into a new file, and
// checks every row and the photo's files came along.
test("API: an old server's SQLite file imports with every row and its photo files", async () => {
  const old = await migratedFile("old");
  await copyDatabase(prisma, open(old));
  await checkImport(old, "from-sqlite");
});

// Puts the seeded data in an old PostgreSQL database, imports it into a new file, and checks every row and the photo's
// files came along; skipped without TEST_POSTGRES_URL.
test("API: an old server's PostgreSQL database imports with every row and its photo files", { skip: !process.env.TEST_POSTGRES_URL }, async () => {
  const server = open(process.env.TEST_POSTGRES_URL!);
  const name = `apc_import_${randomBytes(4).toString("hex")}`;
  const url = new URL(process.env.TEST_POSTGRES_URL!);
  url.pathname = `/${name}`;
  await server.$executeRawUnsafe(`CREATE DATABASE ${name}`);
  try {
    await migrate(url.toString());
    const old = createPrisma(url.toString());
    await copyDatabase(prisma, old);
    await old.$disconnect();
    await checkImport(url.toString(), "from-postgresql");
  } finally {
    await server.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  }
});

// Checks an import is refused from a file of another app, an empty one and one of a newer version, into a database
// holding data, and from a source lacking a migration of this version, which it names as behind.
test("API: an import says why it can't start", async () => {
  const to = await migratedFile("problems-to");
  const other = path.join(FOLDER, "other.db");
  const otherDb = new Database(other);
  otherDb.exec(`CREATE TABLE "Invoice" ("id" TEXT)`);
  otherDb.close();
  assert.equal(await importProblem(`file:${other}`, to), "sourceNotApc");
  const empty = path.join(FOLDER, "empty.db");
  new Database(empty).close();
  assert.equal(await importProblem(`file:${empty}`, to), "sourceNotApc");

  const newer = await migratedFile("newer");
  const newerDb = new Database(newer.slice("file:".length));
  newerDb.prepare(`INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at) VALUES ('x', 'y', '20991231000000_next', 1)`).run();
  newerDb.close();
  assert.equal(await importProblem(newer, to), "sourceNewer");

  const full = await migratedFile("full");
  await copyDatabase(prisma, open(full));
  const target = await migratedFile("full-target");
  await copyDatabase(prisma, open(target));
  assert.equal(await importProblem(full, target), "targetHasData");
  await assert.rejects(importServer({ from: full, to: target, photosTo: path.join(FOLDER, "refused") }), /targetHasData/);
  assert.equal(existsSync(path.join(FOLDER, "refused")), false);

  // This version gains a migration the source hasn't applied.
  const shipped = path.join(FOLDER, "shipped");
  cpSync(migrationsFolder("sqlite"), path.join(shipped, "sqlite"), { recursive: true });
  mkdirSync(path.join(shipped, "sqlite", "20991231000000_next"));
  writeFileSync(path.join(shipped, "sqlite", "20991231000000_next", "migration.sql"), `CREATE TABLE "Next" ("id" TEXT);`);
  process.env.APC_MIGRATIONS_DIR = shipped;
  assert.equal(await importProblem(full, to), "sourceBehind");
});
