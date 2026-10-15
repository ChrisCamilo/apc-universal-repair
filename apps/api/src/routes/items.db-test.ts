import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import sharp from "sharp";
import { TEST_USERS } from "@apc/shared/test-users";
import { buildApp } from "../app.js";
import { prisma } from "../db/client.js";
import { hashToken } from "../sessions/sessions.js";

// The inventory against a real database (`pnpm --filter @apc/api test:db`), migrated and seeded, on PostgreSQL or
// SQLite: creating, searching, filtering, sorting, editing, photos, the CSV import and deleting go through the
// routes, so every query the inventory makes runs on the database. Each run uses its own codes and names, removed at
// the end.

const app = buildApp();
/** Tells this run's items and list names apart from the seed's and other runs'. */
const RUN = randomBytes(3).toString("hex").toUpperCase();
const USER = TEST_USERS[0];
/** The token of this file's session. */
let token = "";

before(async () => {
  process.env.PHOTOS_DIR = await mkdtemp(path.join(tmpdir(), "apc-items-db-"));
  const login = await app.inject({ method: "POST", url: "/sessions", payload: { username: USER.username, password: USER.password } });
  token = login.json().token;
});

after(async () => {
  await prisma.item.deleteMany({ where: { code: { contains: RUN } } });
  await prisma.vehicleModel.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.brand.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.category.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.partBrand.deleteMany({ where: { name: { contains: RUN } } });
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  await rm(process.env.PHOTOS_DIR!, { recursive: true, force: true });
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
 * Builds an item of this run, in its own category, part brand and vehicle brand and model, new to the lists.
 * @param code The part code, before the run's mark.
 * @param fields Fields to change.
 * @returns The item to send.
 */
function item(code: string, fields: object = {}) {
  return {
    code: `${code}-${RUN}`,
    name: `Pastilha de freio ${RUN}`,
    category: `Freios ${RUN}`,
    partBrand: `Cobreq ${RUN}`,
    vehicleBrand: `Gurgel ${RUN}`,
    vehicleModel: `Xavante ${RUN}`,
    position: "D",
    side: "Ambos",
    quantity: 5,
    minQuantity: 2,
    unitPriceCents: 8990,
    ...fields,
  };
}

// Creates two items whose lists are new, and checks the new names join the lists, a code another item uses, written
// with other separators, is refused with 409, and the search finds both ignoring accents and separators.
test("API: items are created with new list names and found by name and code", async () => {
  assert.equal((await call("POST", "/items", item("BP-1"))).statusCode, 201);
  assert.equal((await call("POST", "/items", item("BP-2", { quantity: 1, unitPriceCents: 4990 }))).statusCode, 201);
  assert.equal(await prisma.category.count({ where: { name: `Freios ${RUN}` } }), 1);
  assert.equal((await call("POST", "/items", item("BP 1"))).statusCode, 409);

  const byName = (await call("GET", `/items?q=${encodeURIComponent(`pastilha de FREIO ${RUN}`)}`)).json();
  assert.equal(byName.total, 2);
  const byCode = (await call("GET", `/items?q=bp1${RUN}`)).json();
  assert.deepEqual(byCode.items.map((found: { code: string }) => found.code), [`BP-1-${RUN}`]);
});

// Filters the run's items by low stock, which compares two columns of the row, by position ("Ambos" fits "D") and by
// vehicle model, and sorts them by price both ways, one page at a time.
test("API: items are filtered by stock, position and model, and sorted by price", async () => {
  const run = `q=${RUN}`;
  const low = (await call("GET", `/items?${run}&status=low`)).json();
  assert.deepEqual(low.items.map((found: { code: string }) => found.code), [`BP-2-${RUN}`]);
  assert.equal((await call("GET", `/items?${run}&position=D`)).json().total, 2);
  assert.equal((await call("GET", `/items?${run}&vehicleModel=${encodeURIComponent(`Gurgel ${RUN} Xavante ${RUN}`)}`)).statusCode, 200);
  const cheapFirst = (await call("GET", `/items?${run}&sort=price&order=asc&page=1&pageSize=25`)).json();
  assert.deepEqual(cheapFirst.items.map((found: { unitPriceCents: number }) => found.unitPriceCents), [4990, 8990]);
  const dearFirst = (await call("GET", `/items?${run}&sort=price&order=desc&page=1&pageSize=25`)).json();
  assert.deepEqual(dearFirst.items.map((found: { unitPriceCents: number }) => found.unitPriceCents), [8990, 4990]);
});

// Edits an item's quantity and vehicle model, adding a model to the list, gives it a photo, and checks the answer
// carries the change and the photo, and the photo's row is kept.
test("API: an item is edited and gets a photo", async () => {
  const [found] = (await call("GET", `/items?q=bp1${RUN}`)).json().items;
  const edited = await call("PATCH", `/items/${found.id}`, { quantity: 9, vehicleModel: `Tocantins ${RUN}` });
  assert.equal(edited.statusCode, 200);
  assert.deepEqual([edited.json().quantity, edited.json().vehicleModel], [9, `Tocantins ${RUN}`]);

  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#3366cc" } }).png().toBuffer();
  const boundary = "apc-boundary";
  const payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="pastilha.png"\r\nContent-Type: image/png\r\n\r\n`),
    png,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const photos = await app.inject({
    method: "PUT",
    url: `/items/${found.id}/photos`,
    payload,
    headers: { authorization: `Bearer ${token}`, "content-type": `multipart/form-data; boundary=${boundary}` },
  });
  assert.equal(photos.statusCode, 200);
  assert.equal(photos.json().photos.length, 1);
  assert.equal(await prisma.itemPhoto.count({ where: { itemId: found.id } }), 1);
});

// Imports a file of two items, one with a code in use, and checks one is created and the other updates the item that
// had the code, all in one transaction; then deletes an item, with its photos.
test("API: an import creates and updates in one go, and an item is deleted with its photos", async () => {
  const imported = await call("POST", "/items/import", { items: [item("BP-2", { quantity: 0 }), item("BP-3")] });
  assert.deepEqual(imported.json(), { created: 1, updated: 1 });
  assert.equal((await call("GET", `/items?q=${RUN}&status=out`)).json().total, 1);

  const [found] = (await call("GET", `/items?q=bp1${RUN}`)).json().items;
  assert.equal((await call("DELETE", `/items/${found.id}`)).statusCode, 204);
  assert.equal(await prisma.itemPhoto.count({ where: { itemId: found.id } }), 0);
});

// Edits 20 items and logs in 10 times at once, as the phone and the desktop app can, and checks every request goes
// through: on SQLite, writes wait for each other instead of failing as busy.
test("API: concurrent edits and logins all go through", async () => {
  const [found] = (await call("GET", `/items?q=bp3${RUN}`)).json().items;
  const edits = Array.from({ length: 20 }, (_, index) => call("PATCH", `/items/${found.id}`, { quantity: index }));
  const logins = Array.from({ length: 10 }, () =>
    app.inject({ method: "POST", url: "/sessions", payload: { username: USER.username, password: USER.password }, remoteAddress: "10.0.0.9" }),
  );
  const answers = await Promise.all([...edits, ...logins]);
  assert.deepEqual(
    answers.map((answer) => answer.statusCode),
    [...Array(20).fill(200), ...Array(10).fill(200)],
  );
  const tokens = answers.slice(20).map((answer) => hashToken(answer.json().token));
  await prisma.session.deleteMany({ where: { tokenHash: { in: tokens } } });
});
