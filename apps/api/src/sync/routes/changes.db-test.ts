import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import type { SyncChange, SyncChanges, SyncKind } from "@apc/domain/sync";
import { TEST_USERS } from "@apc/domain/test-users";
import { buildApp } from "../../app.js";
import { prisma } from "../../db/client.js";
import { testDevice, testProof } from "../../devices/testDevices.js";
import { pruneTombstones, TOMBSTONE_DAYS } from "../changes.js";

// The change feed against a real database (`pnpm --filter @apc/api test:db`), migrated and seeded, on PostgreSQL or
// SQLite: what the routes create, edit, merge and delete reaches the feed after the cursor it was made at, in order, a
// deletion as a change with no row, in pages that follow each other, and a cursor the feed can't follow answers 410.
// Each run uses its own codes and names, removed at the end.

const app = buildApp();
/** Tells this run's items and list names apart from the seed's and other runs'. */
const RUN = randomBytes(3).toString("hex").toUpperCase();
const USER = TEST_USERS[0];
/** The token of this file's session. */
let token = "";
/** The device the tests log in from, authorized as it logs in from the server's computer. */
const DEVICE = await testDevice();

before(async () => {
  const login = await app.inject({
    method: "POST",
    url: "/sessions",
    payload: { username: USER.username, password: USER.password, device: await testProof(app, DEVICE) },
  });
  token = login.json().token;
});

after(async () => {
  await prisma.item.deleteMany({ where: { brands: { some: { code: { contains: RUN } } } } });
  // The catalog entries the run's vehicles added, once no item uses them.
  await prisma.catalogModel.deleteMany({ where: { vehicleModel: { name: { contains: RUN } } } });
  await prisma.catalogBrand.deleteMany({ where: { brand: { name: { contains: RUN } } } });
  await prisma.vehicleModel.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.brand.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.category.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.partBrand.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.device.deleteMany({ where: { publicKey: await DEVICE.publicKey() } });
  await app.close();
  await prisma.$disconnect();
});

/**
 * Calls the API with this file's session.
 * @param method The method.
 * @param url The path.
 * @param payload The JSON body, if any.
 * @returns The answer.
 */
function call(method: "GET" | "POST" | "PATCH" | "DELETE", url: string, payload?: object) {
  return app.inject({ method, url, payload, headers: { authorization: `Bearer ${token}` } });
}

/**
 * Reads one page of the feed, checking it is answered.
 * @param since The cursor, if any.
 * @param limit The most changes to send, if any.
 * @returns The page.
 */
async function page(since?: string, limit?: number): Promise<SyncChanges> {
  const query = new URLSearchParams({ ...(since && { since }), ...(limit && { limit: String(limit) }) });
  const answer = await call("GET", `/sync/changes?${query}`);
  assert.equal(answer.statusCode, 200, answer.body);
  return answer.json();
}

/**
 * Reads every page of the feed after a cursor, each from the cursor of the last.
 * @param since The cursor, or none for a full copy.
 * @param limit The most changes of each page.
 * @returns Every change, in order, and the last cursor.
 */
async function allAfter(since?: string, limit?: number): Promise<{ changes: SyncChange[]; cursor: string }> {
  const changes: SyncChange[] = [];
  let cursor = since;
  for (;;) {
    const next = await page(cursor, limit);
    changes.push(...next.changes);
    cursor = next.cursor;
    if (!next.more) {
      return { changes, cursor };
    }
  }
}

/**
 * Finds the cursor of the feed as it is now, after every change.
 * @returns The cursor.
 */
async function cursorNow(): Promise<string> {
  return (await allAfter(undefined, 1000)).cursor;
}

/**
 * Creates an item of this run.
 * @param code The part code, before the run's mark.
 * @param fields Fields to send instead of the run's own.
 * @returns The item, as the API answers it.
 */
async function createItem(code: string, fields: object = {}) {
  const created = await call("POST", "/items", {
    name: `Farol ${RUN}`,
    category: `Iluminação ${RUN}`,
    vehicles: [{ vehicleBrand: `Gurgel ${RUN}` }],
    brands: [{ code: `${code}-${RUN}`, partBrand: `Arteb ${RUN}`, unitPriceCents: 19990 }],
    ...fields,
  });
  assert.equal(created.statusCode, 201, created.body);
  return created.json();
}

/**
 * Lists changes as kind and id, the deleted ones marked, to compare them.
 * @param changes The changes.
 * @returns "kind id" for each, with " deleted" for a change with no row.
 */
function named(changes: SyncChange[]): string[] {
  return changes.map((change) => `${change.kind} ${change.id}${change.row ? "" : " deleted"}`);
}

/**
 * Finds the last change of a kind, of a row when an id is given.
 * @param changes The changes.
 * @param kind The kind.
 * @param id The row's id, if any.
 * @returns The change, typed as its kind's, or undefined.
 */
function lastOf<Kind extends SyncKind>(changes: SyncChange[], kind: Kind, id?: string) {
  return changes.filter((change): change is Extract<SyncChange, { kind: Kind }> => change.kind === kind && (id === undefined || change.id === id)).at(-1);
}

/**
 * Checks changes come in the order of their versions, each version once.
 * @param changes The changes.
 */
function assertInOrder(changes: SyncChange[]) {
  for (const [index, change] of changes.entries()) {
    assert.ok(index === 0 || change.version > changes[index - 1].version, `version ${change.version} after ${changes[index - 1]?.version}`);
  }
}

// Creates an item with new list names and a photo, edits it, then deletes it, reading the feed from the cursor before
// each step: the creation sends the new entries before the item, the edit sends the item as it became, and the
// deletion sends the item, its brand and its photo with no row, each after the cursor and in order.
test("API: an item's creation, edit and deletion reach the feed after the cursor, in order", async () => {
  const start = await cursorNow();
  const item = await createItem("FD-1");
  const [brand] = item.brands;
  const photo = await prisma.itemPhoto.create({ data: { brandId: brand.id, position: 0, file: `${RUN}.webp`, thumbFile: `${RUN}-thumb.webp` } });
  const created = await allAfter(start);
  assertInOrder(created.changes);
  const category = await prisma.category.findUniqueOrThrow({ where: { nameKey: `iluminacao ${RUN.toLowerCase()}` } });
  const kinds = named(created.changes);
  assert.ok(kinds.indexOf(`category ${category.id}`) < kinds.indexOf(`item ${item.id}`), kinds.join("\n"));
  const sentItem = lastOf(created.changes, "item", item.id);
  assert.deepEqual(sentItem?.row && { name: sentItem.row.name, categoryId: sentItem.row.categoryId }, { name: `Farol ${RUN}`, categoryId: category.id });
  const sentPhoto = lastOf(created.changes, "itemPhoto", photo.id);
  assert.ok(sentPhoto?.row?.url.startsWith(`/photos/${RUN}.webp?`), JSON.stringify(sentPhoto));
  assert.ok(kinds.includes(`itemBrand ${brand.id}`), kinds.join("\n"));

  const edited = await call("PATCH", `/items/${item.id}`, { name: `Farol novo ${RUN}`, originalCodes: [`OEM-${RUN}`] });
  assert.equal(edited.statusCode, 200, edited.body);
  const afterEdit = await allAfter(created.cursor);
  const editedItem = lastOf(afterEdit.changes, "item");
  assert.deepEqual([editedItem?.id, editedItem?.row?.name, editedItem?.row?.originalCodes], [item.id, `Farol novo ${RUN}`, [`OEM-${RUN}`]]);
  assert.equal(afterEdit.changes.filter((change) => change.kind === "item").length, 1);

  assert.equal((await call("DELETE", `/items/${item.id}`)).statusCode, 204);
  const deleted = await allAfter(afterEdit.cursor);
  assertInOrder(deleted.changes);
  assert.deepEqual(named(deleted.changes).sort(), [`item ${item.id} deleted`, `itemBrand ${brand.id} deleted`, `itemPhoto ${photo.id} deleted`].sort());
  // From the first cursor the item is still created, edited and deleted in that order, its last change its deletion.
  assert.equal(named((await allAfter(start)).changes).filter((change) => change.startsWith(`item ${item.id}`)).at(-1), `item ${item.id} deleted`);
});

// Merges a vehicle brand into another, which moves an item's vehicle, and renames a category, and checks the feed
// sends the item with its new vehicle brand, the merged brand with no row and the category's new name.
test("API: a list's merge and rename reach the feed, with the items they move", async () => {
  const item = await createItem("FD-2", { vehicles: [{ vehicleBrand: `Puma ${RUN}` }] });
  await createItem("FD-3", { vehicles: [{ vehicleBrand: `Miura ${RUN}` }] });
  const [puma, miura] = await Promise.all(
    [`puma ${RUN.toLowerCase()}`, `miura ${RUN.toLowerCase()}`].map((nameKey) => prisma.brand.findUniqueOrThrow({ where: { nameKey } })),
  );
  const category = await prisma.category.findUniqueOrThrow({ where: { nameKey: `iluminacao ${RUN.toLowerCase()}` } });
  const start = await cursorNow();

  assert.equal((await call("POST", `/vehicle-brands/${puma.id}/merge`, { into: miura.id })).statusCode, 200);
  assert.equal((await call("PATCH", `/categories/${category.id}`, { name: `Faróis ${RUN}` })).statusCode, 200);
  const { changes } = await allAfter(start);
  assertInOrder(changes);
  assert.equal(lastOf(changes, "item", item.id)?.row?.vehicles[0].vehicleBrandId, miura.id);
  assert.ok(named(changes).includes(`vehicleBrand ${puma.id} deleted`), named(changes).join("\n"));
  assert.equal(lastOf(changes, "category", category.id)?.row?.name, `Faróis ${RUN}`);
});

// Creates an item whose vehicle names a generation and version the Catalog doesn't have, which adds them there, and
// checks the feed sends the new catalog brand, model, generation and version, and the item linked to them.
test("API: the catalog entries an item adds reach the feed with it", async () => {
  const start = await cursorNow();
  const item = await createItem("FD-4", {
    vehicles: [{ vehicleBrand: `Gurgel ${RUN}`, vehicleModel: `BR-800 ${RUN}`, firstYear: 1988, lastYear: 1991, version: "SL" }],
  });
  const { changes } = await allAfter(start);
  const generation = lastOf(changes, "catalogGeneration");
  const version = lastOf(changes, "catalogVersion");
  assert.deepEqual([generation?.row?.firstYear, generation?.row?.lastYear, version?.row?.name], [1988, 1991, "SL"]);
  assert.ok(lastOf(changes, "catalogBrand") && lastOf(changes, "catalogModel"));
  const sent = lastOf(changes, "item", item.id);
  assert.deepEqual(sent?.row?.vehicles.map((vehicle) => [vehicle.generationId, vehicle.versionId]), [[generation?.id, version?.id]]);
});

// Reads the changes since a cursor one at a time and all at once, and checks the pages, each from the last one's
// cursor, add up to the same changes in the same order, the last page saying nothing more is waiting.
test("API: the feed comes in pages, each from the cursor of the last", async () => {
  const start = await cursorNow();
  await createItem("FD-5");
  const whole = await page(start, 1000);
  assert.equal(whole.more, false);
  const paged = await allAfter(start, 1);
  assert.ok(whole.changes.length > 1);
  assert.deepEqual(named(paged.changes), named(whole.changes));
  assert.equal(paged.cursor, whole.cursor);
});

// Reads the whole feed without a cursor, as a phone's first copy, and checks it holds every item there is, each once,
// with no deletions.
test("API: a full copy holds every item, with no deletions", async () => {
  const { changes } = await allAfter(undefined, 1000);
  const items = changes.filter((change) => change.kind === "item");
  assert.equal(items.length, await prisma.item.count());
  assert.equal(new Set(items.map((change) => change.id)).size, items.length);
  assert.ok(changes.every((change) => change.row));
});

// Asks with cursors the feed can't follow (one that isn't a cursor, one of another database, one from after its last
// version) and with one from before tombstones dropped, and checks each answers 410, while a full copy made in pages
// still reaches its end.
test("API: a cursor the feed can't follow answers 410", async () => {
  const start = await cursorNow();
  const [databaseId, version] = start.split(".");
  for (const since of ["abc", `other-database.${version}`, `${databaseId}.${Number(version) + 1000}`]) {
    const answer = await call("GET", `/sync/changes?since=${since}`);
    assert.equal(answer.statusCode, 410, since);
  }

  const item = await createItem("FD-6");
  assert.equal((await call("DELETE", `/items/${item.id}`)).statusCode, 204);
  // The deletion, and every one before it, is dropped once older than the feed keeps them.
  assert.ok((await pruneTombstones(new Date(Date.now() + (TOMBSTONE_DAYS + 1) * 86_400_000))) > 0);
  assert.equal((await call("GET", `/sync/changes?since=${start}`)).statusCode, 410);
  // A full copy made in pages after the drop reaches its end, and its cursor goes on from there.
  const copy = await allAfter(undefined, 50);
  assert.ok(copy.changes.some((change) => change.kind === "item"));
  await page(copy.cursor);
});
