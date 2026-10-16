import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { TEST_USERS } from "@apc/shared/test-users";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createSession } from "../sessions/sessions.js";
import { createPrisma, prisma } from "./client.js";
import { copyDatabase, copyProblems, TABLES } from "./copy.js";
import { API_DIR } from "./provider.js";

// Copying between databases (`pnpm --filter @apc/api test:db`), from the seeded database of DATABASE_URL, PostgreSQL
// or SQLite, to new SQLite files and, when TEST_POSTGRES_URL names a PostgreSQL server whose user can create
// databases, to a new PostgreSQL database and back. Every target is made here with db:migrate and removed at the end.

/** The seeded database the data comes from. */
const SOURCE_URL = process.env.DATABASE_URL ?? "";
/** A folder for this run's SQLite files. */
const FOLDER = mkdtempSync(path.join(tmpdir(), "apc-copy-"));
/** The photo row this run adds to the source. */
const PHOTO_ID = `00000000-0000-4000-8000-${randomBytes(6).toString("hex")}`;
const USER = TEST_USERS[0];
/** The clients this run opens, closed at the end. */
const opened: PrismaClient[] = [];
/** When the user had seen the tutorial before this run, put back at the end. */
let seenBefore: Date | null = null;

before(async () => {
  const user = (await prisma.user.findUnique({ where: { username: USER.username } }))!;
  seenBefore = user.inventoryTutorialSeenAt;
  await prisma.user.update({ where: { id: user.id }, data: { inventoryTutorialSeenAt: new Date("2026-10-01T12:34:56.789Z") } });
  const item = (await prisma.item.findFirst({ where: { photos: { none: {} } }, orderBy: { code: "asc" } }))!;
  await prisma.itemPhoto.create({ data: { id: PHOTO_ID, itemId: item.id, position: 0, file: `${PHOTO_ID}.webp`, thumbFile: `${PHOTO_ID}-thumb.webp` } });
  await createSession(user.id);
});

after(async () => {
  await prisma.itemPhoto.deleteMany({ where: { id: PHOTO_ID } });
  await prisma.user.update({ where: { username: USER.username }, data: { inventoryTutorialSeenAt: seenBefore } });
  await prisma.session.deleteMany({ where: { user: { username: USER.username } } });
  await Promise.all([prisma, ...opened].map((client) => client.$disconnect()));
  rmSync(FOLDER, { recursive: true, force: true });
});

/**
 * Makes an empty database with every migration applied, as `pnpm --filter @apc/api db:migrate` does.
 * @param url Its DATABASE_URL.
 * @returns Its client.
 */
function migrated(url: string): PrismaClient {
  const run = spawnSync("pnpm", ["exec", "tsx", "scripts/db.ts", "migrate"], {
    cwd: API_DIR,
    env: { ...process.env, DATABASE_URL: url },
    shell: true,
    encoding: "utf8",
  });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  return opened[opened.push(createPrisma(url)) - 1];
}

/**
 * Names a new SQLite file of this run.
 * @param name The file's name.
 * @returns Its DATABASE_URL.
 */
function sqliteUrl(name: string): string {
  return `file:${path.join(FOLDER, `${name}.db`)}`;
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

// Copies the seeded database, with a photo and a user who has seen the tutorial, to a new SQLite file, and checks
// every row of every table is equal, ids, dates and keys included, and the sessions were left out.
test("API: the data copies to a new SQLite file, every row equal, without the sessions", async () => {
  const target = migrated(sqliteUrl("copy"));
  assert.deepEqual(await copyProblems({ client: prisma, url: SOURCE_URL }, { client: target, url: sqliteUrl("copy") }), []);
  const counts = await copyDatabase(prisma, target);
  assert.ok(Object.values(counts).every((count) => count.source === count.target && count.source > 0));
  assert.deepEqual(await rowsOf(target), await rowsOf(prisma));
  assert.ok((await prisma.session.count()) > 0);
  assert.equal(await target.session.count(), 0);
});

// Copies the seeded database to a new SQLite file and on to a new PostgreSQL database, and checks the second holds the
// same rows as the first source; skipped without TEST_POSTGRES_URL.
test("API: the data copies on to a new PostgreSQL database, every row equal", { skip: !process.env.TEST_POSTGRES_URL }, async () => {
  const server = createPrisma(process.env.TEST_POSTGRES_URL!);
  opened.push(server);
  const name = `apc_copy_${randomBytes(4).toString("hex")}`;
  const url = new URL(process.env.TEST_POSTGRES_URL!);
  url.pathname = `/${name}`;
  await server.$executeRawUnsafe(`CREATE DATABASE ${name}`);
  try {
    const middle = migrated(sqliteUrl("middle"));
    await copyDatabase(prisma, middle);
    const target = migrated(url.toString());
    assert.deepEqual(await copyProblems({ client: middle, url: sqliteUrl("middle") }, { client: target, url: url.toString() }), []);
    await copyDatabase(middle, target);
    assert.deepEqual(await rowsOf(target), await rowsOf(prisma));
    await target.$disconnect();
  } finally {
    await server.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  }
});

// Copies once to a new file, then checks a second copy to it is refused for holding data, and a copy to a file with
// no migrations is refused for lacking them.
test("API: a target that isn't empty, or isn't migrated, is refused", async () => {
  const full = migrated(sqliteUrl("full"));
  await copyDatabase(prisma, full);
  const refused = await copyProblems({ client: prisma, url: SOURCE_URL }, { client: full, url: sqliteUrl("full") });
  assert.match(refused.join("\n"), /isn't empty/);

  const bare = createPrisma(sqliteUrl("bare"));
  opened.push(bare);
  const unmigrated = await copyProblems({ client: prisma, url: SOURCE_URL }, { client: bare, url: sqliteUrl("bare") });
  assert.match(unmigrated.join("\n"), /The target lacks \d+ migration/);
});

// Fails a copy after its first tables, and checks the target keeps nothing: the copy runs in one transaction.
test("API: a copy that fails halfway leaves the target empty", async () => {
  const target = migrated(sqliteUrl("halfway"));
  await assert.rejects(
    copyDatabase(prisma, target, (table) => {
      if (table === "brand") {
        throw new Error("Stopped halfway.");
      }
    }),
    /Stopped halfway/,
  );
  for (const name of TABLES) {
    assert.equal(await (target[name] as unknown as { count: () => Promise<number> }).count(), 0, name);
  }
});
