import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import sharp from "sharp";
import { itemMatchesQuery } from "@apc/shared/item-filters";
import { itemListQuerySchema, type Item } from "@apc/shared/items";
import { TEST_USERS } from "@apc/shared/test-users";
import { buildApp } from "../app.js";
import { prisma } from "../db/client.js";
import { hashToken } from "../sessions/sessions.js";

// The inventory against a real database (`pnpm --filter @apc/api test:db`), migrated and seeded, on PostgreSQL or
// SQLite: creating items with their brands and original codes, searching, filtering, sorting, editing them and their brands, photos, the
// CSV import and deleting go through the routes, so every query the inventory makes runs on the database. Each run
// uses its own codes and names, removed at the end.

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
  await prisma.item.deleteMany({ where: { brands: { some: { code: { contains: RUN } } } } });
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
 * Builds a brand of this run's items, its part brand new to the list.
 * @param code The part code, before the run's mark.
 * @param partBrand The part brand, before the run's mark.
 * @param fields Fields to change.
 * @returns The brand to send.
 */
function brand(code: string, partBrand: string, fields: object = {}) {
  return { code: `${code}-${RUN}`, partBrand: `${partBrand} ${RUN}`, quantity: 5, unitPriceCents: 8990, ...fields };
}

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
 * Finds this run's item by one of its codes.
 * @param code The code, before the run's mark, written loosely.
 * @returns The item as the API sends it.
 */
async function find(code: string): Promise<Item> {
  const [found] = (await call("GET", `/items?q=${encodeURIComponent(`${code}${RUN}`)}`)).json().items;
  return found;
}

/**
 * Sets a brand's photos to copies of saved photos, as a duplicated item's are.
 * @param itemId The item.
 * @param brandId Its brand.
 * @param photoIds The photos to copy, in order.
 * @returns The answer.
 */
function copyPhotos(itemId: string, brandId: string, photoIds: string[]) {
  const boundary = "apc-boundary";
  const parts = photoIds.map((photoId) => `--${boundary}\r\nContent-Disposition: form-data; name="copy"\r\n\r\n${photoId}\r\n`);
  return app.inject({
    method: "PUT",
    url: `/items/${itemId}/brands/${brandId}/photos`,
    payload: `${parts.join("")}--${boundary}--\r\n`,
    headers: { authorization: `Bearer ${token}`, "content-type": `multipart/form-data; boundary=${boundary}` },
  });
}

/**
 * Builds an item of this run, in its own category and vehicle brand and model, new to the lists.
 * @param brands Its brands.
 * @param fields Fields to change.
 * @returns The item to send.
 */
function item(brands: object[], fields: object = {}) {
  return {
    name: `Pastilha de freio ${RUN}`,
    category: `Freios ${RUN}`,
    vehicles: [{ vehicleBrand: `Gurgel ${RUN}`, vehicleModel: `Xavante ${RUN}` }],
    position: "D",
    side: "Ambos",
    minQuantity: 2,
    brands,
    ...fields,
  };
}

/**
 * Sends photos to a brand of an item.
 * @param itemId The item.
 * @param brandId Its brand.
 * @returns The answer.
 */
async function sendPhoto(itemId: string, brandId: string) {
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#3366cc" } }).png().toBuffer();
  const boundary = "apc-boundary";
  const payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="pastilha.png"\r\nContent-Type: image/png\r\n\r\n`),
    png,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return app.inject({
    method: "PUT",
    url: `/items/${itemId}/brands/${brandId}/photos`,
    payload,
    headers: { authorization: `Bearer ${token}`, "content-type": `multipart/form-data; boundary=${boundary}` },
  });
}

// Creates an item of two brands and one of one, whose lists are new, and checks the new names join the lists, the
// quantity is the brands' sum, a code another item's brand uses, written with other separators, is refused with 409
// naming the item and the code, and the search finds the item by its name and by either brand's code.
test("API: items are created with their brands and found by name and any code", async () => {
  const created = await call("POST", "/items", item([brand("BP-1", "Cobreq", { quantity: 2 }), brand("FL-1", "Fras-le", { quantity: 1, unitPriceCents: 9490 })]));
  assert.equal(created.statusCode, 201);
  assert.deepEqual(
    [created.json().quantity, created.json().brands.map((each: { partBrand: string }) => each.partBrand)],
    [3, [`Cobreq ${RUN}`, `Fras-le ${RUN}`]],
  );
  assert.equal((await call("POST", "/items", item([brand("BP-2", "Cobreq", { quantity: 1, unitPriceCents: 4990 })]))).statusCode, 201);
  assert.equal(await prisma.partBrand.count({ where: { name: `Fras-le ${RUN}` } }), 1);
  const taken = await call("POST", "/items", item([brand("NEW", "Bosch"), brand("FL 1", "Valeo")]));
  assert.equal(taken.statusCode, 409);
  assert.deepEqual(taken.json().details[0], {
    field: "brands/1/code",
    message: `Code "FL 1-${RUN}" is already used by "Pastilha de freio ${RUN}".`,
    code: `FL 1-${RUN}`,
    itemId: created.json().id,
    itemName: `Pastilha de freio ${RUN}`,
  });

  const byName = (await call("GET", `/items?q=${encodeURIComponent(`pastilha de FREIO ${RUN}`)}`)).json();
  assert.equal(byName.total, 2);
  assert.equal((await find("fl1")).id, created.json().id);
  assert.equal((await find("bp1")).id, created.json().id);
});

// Filters the run's items by low stock, which compares the brands' sum with the item's minimum, by a part brand only
// the second brand of an item has, and by position ("Ambos" fits "D"), and sorts them by their lowest price both ways,
// one page at a time.
test("API: items are filtered by stock and any brand, and sorted by their lowest price", async () => {
  const run = `q=${RUN}`;
  const low = (await call("GET", `/items?${run}&status=low`)).json();
  assert.deepEqual(low.items.map((found: Item) => found.brands[0].code), [`BP-2-${RUN}`]);
  const byBrand = (await call("GET", `/items?${run}&partBrand=${encodeURIComponent(`Fras-le ${RUN}`)}`)).json();
  assert.deepEqual(byBrand.items.map((found: Item) => found.brands[0].code), [`BP-1-${RUN}`]);
  assert.equal((await call("GET", `/items?${run}&position=D`)).json().total, 2);
  const cheapFirst = (await call("GET", `/items?${run}&sort=price&order=asc&page=1&pageSize=25`)).json();
  assert.deepEqual(cheapFirst.items.map((found: Item) => found.brands[0].code), [`BP-2-${RUN}`, `BP-1-${RUN}`]);
  const dearFirst = (await call("GET", `/items?${run}&sort=price&order=desc&page=1&pageSize=25`)).json();
  assert.deepEqual(dearFirst.items.map((found: Item) => found.brands[0].code), [`BP-1-${RUN}`, `BP-2-${RUN}`]);
});

// Adds items of every kind the filters tell apart, then asks the API for the same queries the shared matcher reads in
// memory, for the web app's demo, and checks both choose the same items, of the run's and the seed's: the search, each
// filter, "Ambos" and the stock status. The demo answers the list with the matcher, so it keeps choosing as the API.
test("API: the shared item matcher chooses the items the API's list does", async () => {
  const added = [
    item([brand("MQ-1", "Cobreq", { quantity: 0, color: "Preto", location: "A-2" })], { name: `Lona de freio ${RUN}`, position: "T", side: "LE" }),
    item([brand("MQ-2", "Mann", { quantity: 9, location: "B-1" })], {
      name: `Filtro de óleo ${RUN}`,
      category: `Motor ${RUN}`,
      position: "N/A",
      side: "N/A",
      originalCodes: [`OEM 77-${RUN}`],
      vehicles: [{ vehicleBrand: `Gurgel ${RUN}` }, { vehicleBrand: `Lafer ${RUN}`, vehicleModel: `LL ${RUN}` }],
    }),
    item([brand("MQ-3", "Cofap", { quantity: 1 }), brand("MQ-4", "Mann", { quantity: 1, color: "Azul" })], {
      name: `Amortecedor ${RUN}`,
      category: `Suspensão ${RUN}`,
      position: "Ambos",
      minQuantity: 5,
    }),
  ];
  for (const each of added) {
    assert.equal((await call("POST", "/items", each)).statusCode, 201);
  }
  const all = (await call("GET", "/items")).json().items as Item[];
  const queries: Record<string, string | string[]>[] = [
    { q: RUN },
    { q: `mq3${RUN}` },
    { q: `oem77${RUN}` },
    { q: `oleo ${RUN}` },
    { category: [`Freios ${RUN}`, `Motor ${RUN}`] },
    { partBrand: `Mann ${RUN}` },
    { vehicleBrand: `Lafer ${RUN}` },
    { vehicleModel: [`Lafer ${RUN}|LL ${RUN}`, `Gurgel ${RUN}|Xavante ${RUN}`] },
    { position: "D" },
    { position: "T", q: RUN },
    { side: ["LD"] },
    { side: "N/A" },
    { color: "Azul" },
    { location: ["A-2", "B-1"] },
    { status: "low" },
    { status: "out" },
    { q: RUN, status: "low", partBrand: `Cofap ${RUN}` },
  ];
  for (const query of queries) {
    const search = new URLSearchParams(Object.entries(query).flatMap(([key, values]) => [values].flat().map((value): [string, string] => [key, value])));
    const fromApi = ((await call("GET", `/items?${search}`)).json().items as Item[]).map((found) => found.id).sort();
    const fromMatcher = all.filter((each) => itemMatchesQuery(each, itemListQuerySchema.parse(query))).map((found) => found.id).sort();
    assert.deepEqual(fromMatcher, fromApi, JSON.stringify(query));
  }
});

// Edits an item's vehicle, adding a model to the list, gives its second brand a photo, then sends its brands
// with the first changed, the second left out and a new one, and checks the answer carries every change, the
// quantity follows, the left-out brand's photo is gone with its row and its files, and a brand of another item can't
// be sent as this one's.
test("API: an item is edited with its brands, and a brand left out goes with its photos", async () => {
  const found = await find("bp1");
  const edited = await call("PATCH", `/items/${found.id}`, { vehicles: [{ vehicleBrand: `Gurgel ${RUN}`, vehicleModel: `Tocantins ${RUN}` }] });
  assert.equal(edited.statusCode, 200);
  assert.deepEqual(edited.json().vehicles, [{ vehicleBrand: `Gurgel ${RUN}`, vehicleModel: `Tocantins ${RUN}` }]);

  const [first, second] = found.brands;
  const photos = await sendPhoto(found.id, second.id);
  assert.equal(photos.statusCode, 200);
  assert.equal(photos.json().brands[1].photos.length, 1);
  assert.equal((await sendPhoto(found.id, (await find("bp2")).brands[0].id)).statusCode, 404);
  const [stored] = await prisma.itemPhoto.findMany({ where: { brandId: second.id } });

  const brands = await call("PATCH", `/items/${found.id}`, {
    brands: [
      { id: first.id, partBrand: first.partBrand, code: `BP-1A-${RUN}`, quantity: 7, unitPriceCents: first.unitPriceCents },
      brand("BS-1", "Bosch", { quantity: 4 }),
    ],
  });
  assert.equal(brands.statusCode, 200);
  assert.deepEqual(
    brands.json().brands.map((each: { id: string; code: string; quantity: number }) => [each.id === first.id, each.code, each.quantity]),
    [
      [true, `BP-1A-${RUN}`, 7],
      [false, `BS-1-${RUN}`, 4],
    ],
  );
  assert.equal(brands.json().quantity, 11);
  assert.equal(await prisma.itemBrand.count({ where: { id: second.id } }), 0);
  assert.equal(await prisma.itemPhoto.count({ where: { id: stored.id } }), 0);
  const [other] = (await find("bp2")).brands;
  const foreign = await call("PATCH", `/items/${found.id}`, { brands: [{ id: other.id, partBrand: other.partBrand, code: other.code, unitPriceCents: 1 }] });
  assert.equal(foreign.statusCode, 400);
});

// Imports a file of three items: one whose first code is in use, with a new brand; one new; and one whose codes
// belong to two different items; and checks the last refuses the whole file with 409. Then imports the first two and
// checks one is created and the other updates the item that had the code, its new brand added and its quantity summed,
// all in one transaction; and that a new code for a part brand the item has under another code is refused.
test("API: an import adds brands to the item of a code in use, and refuses what it can't save", async () => {
  const update = item([brand("BP-2", "Cobreq", { quantity: 0 }), brand("FL-2", "Fras-le", { quantity: 3 })]);
  const fresh = item([brand("BP-3", "Cobreq")], { name: `Disco de freio ${RUN}` });
  const mixed = item([brand("BP-1A", "Cobreq"), brand("BP-3", "Bosch")]);
  const refused = await call("POST", "/items/import", { items: [update, fresh, mixed] });
  assert.equal(refused.statusCode, 409);
  assert.equal(await prisma.itemBrand.count({ where: { code: `FL-2-${RUN}` } }), 0);

  const imported = await call("POST", "/items/import", { items: [update, fresh] });
  assert.deepEqual(imported.json(), { created: 1, updated: 1 });
  const updated = await find("bp2");
  assert.deepEqual(
    [updated.quantity, updated.brands.map((each) => each.code)],
    [3, [`BP-2-${RUN}`, `FL-2-${RUN}`]],
  );
  const twice = await call("POST", "/items/import", { items: [item([brand("BP-2", "Cobreq"), brand("FL-9", "Fras-le")])] });
  assert.equal(twice.statusCode, 409);
});

// Creates an item with two original codes and checks they come back uppercase and in order and the search finds it by
// each one; that a code another item uses is refused with 409 naming the field and the item, whether it is the other
// item's original code or its brand's code; that a code held twice in the item, as an original and a brand's code, is
// refused with 400 on a create and on an edit sending only one of them; and that an edit replaces the list.
test("API: items keep the vehicle maker's original codes and are found by each one", async () => {
  const codes = [`oe-1-${RUN}`, `OE 2-${RUN}`];
  const created = await call("POST", "/items", item([brand("OEB-1", "Cobreq")], { name: `Junta ${RUN}`, originalCodes: codes }));
  assert.equal(created.statusCode, 201);
  assert.deepEqual(created.json().originalCodes, [`OE-1-${RUN}`, `OE 2-${RUN}`]);
  assert.equal((await find("oe2")).id, created.json().id);
  assert.equal((await find("o.e.1-")).id, created.json().id);

  for (const [sent, field] of [
    [{ originalCodes: [`OE2-${RUN}`] }, "originalCodes/0"],
    [{ originalCodes: [`OEB 1-${RUN}`] }, "originalCodes/0"],
    [{ brands: [brand("OE-1", "Bosch")] }, "brands/0/code"],
  ] as const) {
    const taken = await call("POST", "/items", { ...item([brand("OEB-2", "Bosch")], { name: `Outra ${RUN}` }), ...sent });
    assert.equal(taken.statusCode, 409);
    assert.deepEqual([taken.json().details[0].field, taken.json().details[0].itemName], [field, `Junta ${RUN}`]);
  }
  const twice = await call("POST", "/items", item([brand("OEB-3", "Bosch")], { name: `Outra ${RUN}`, originalCodes: [`OEB-3-${RUN}`] }));
  assert.equal(twice.statusCode, 400);
  const id = created.json().id;
  assert.equal((await call("PATCH", `/items/${id}`, { originalCodes: [`OEB1-${RUN}`] })).statusCode, 400);
  const [own] = created.json().brands;
  const moved = { id: own.id, partBrand: own.partBrand, code: `OE-2-${RUN}`, unitPriceCents: 8990 };
  assert.equal((await call("PATCH", `/items/${id}`, { brands: [moved] })).statusCode, 400);

  const edited = await call("PATCH", `/items/${id}`, { originalCodes: [`OE-3-${RUN}`] });
  assert.deepEqual(edited.json().originalCodes, [`OE-3-${RUN}`]);
  assert.equal(await find("oe1"), undefined);
  assert.equal(await prisma.itemOriginalCode.count({ where: { itemId: id } }), 1);
  assert.equal((await call("POST", "/items", item([brand("OEB-4", "Bosch")], { name: `Outra ${RUN}`, originalCodes: [`OE-1-${RUN}`] }))).statusCode, 201);
});

// Imports an item whose only code in use is another item's original code, and checks it updates that item, its new
// brand and its new original code joining the ones it has; then that a code the item holds as an original one, sent
// as a brand's, is refused.
test("API: an import finds the item of an original code and adds the codes it lacks", async () => {
  const held = await call("POST", "/items", item([brand("IMB-1", "Cobreq")], { name: `Bieleta ${RUN}`, originalCodes: [`IMO-1-${RUN}`] }));
  const sent = item([brand("IMB-2", "Fras-le")], { name: `Bieleta ${RUN}`, originalCodes: [`imo 1-${RUN}`, `IMO-2-${RUN}`] });
  assert.deepEqual((await call("POST", "/items/import", { items: [sent] })).json(), { created: 0, updated: 1 });
  const updated = await find("imo2");
  assert.equal(updated.id, held.json().id);
  assert.deepEqual(
    [updated.originalCodes, updated.brands.map((each) => each.code)],
    [
      [`IMO-1-${RUN}`, `IMO-2-${RUN}`],
      [`IMB-1-${RUN}`, `IMB-2-${RUN}`],
    ],
  );
  const crossed = await call("POST", "/items/import", { items: [item([brand("IMO-2", "Bosch")], { name: `Bieleta ${RUN}` })] });
  assert.equal(crossed.statusCode, 409);
});

// Creates an item that fits three vehicles, one of any model of its brand, and checks they come back in order and the
// filters by a vehicle brand and by a vehicle model find it by any of them; that a vehicle twice, written otherwise,
// and Universal among others are refused with 400; and that an edit replaces the list.
test("API: an item fits several vehicles and is found by each one", async () => {
  const vehicles = [
    { vehicleBrand: `Gurgel ${RUN}`, vehicleModel: `X12 ${RUN}` },
    { vehicleBrand: `Puma ${RUN}`, vehicleModel: `GTE ${RUN}` },
    { vehicleBrand: `Miura ${RUN}` },
  ];
  const created = await call("POST", "/items", item([brand("VE-1", "Cofap")], { name: `Lanterna ${RUN}`, vehicles }));
  assert.equal(created.statusCode, 201);
  assert.deepEqual(created.json().vehicles, [
    { vehicleBrand: `Gurgel ${RUN}`, vehicleModel: `X12 ${RUN}` },
    { vehicleBrand: `Puma ${RUN}`, vehicleModel: `GTE ${RUN}` },
    { vehicleBrand: `Miura ${RUN}`, vehicleModel: null },
  ]);
  /** The names of this run's items a list query finds. */
  const names = async (query: string) =>
    ((await call("GET", `/items?q=${RUN}&${query}`)).json().items as Item[]).map((each) => each.name);
  assert.deepEqual(await names(`vehicleBrand=${encodeURIComponent(`Miura ${RUN}`)}`), [`Lanterna ${RUN}`]);
  assert.deepEqual(await names(`vehicleModel=${encodeURIComponent(`Puma ${RUN}|GTE ${RUN}`)}`), [`Lanterna ${RUN}`]);
  assert.deepEqual(await names(`vehicleModel=${encodeURIComponent(`Gurgel ${RUN}|GTE ${RUN}`)}`), []);

  const twice = item([brand("VE-2", "Cofap")], { vehicles: [vehicles[0], { vehicleBrand: ` gurgel ${RUN}`, vehicleModel: `x12 ${RUN}` }] });
  assert.equal((await call("POST", "/items", twice)).statusCode, 400);
  const universal = item([brand("VE-3", "Cofap")], { vehicles: [{ vehicleBrand: "Universal" }, vehicles[2]] });
  assert.equal((await call("POST", "/items", universal)).statusCode, 400);

  const edited = await call("PATCH", `/items/${created.json().id}`, { vehicles: [vehicles[2]] });
  assert.deepEqual(edited.json().vehicles, [{ vehicleBrand: `Miura ${RUN}`, vehicleModel: null }]);
  assert.equal(await prisma.itemVehicle.count({ where: { itemId: created.json().id } }), 1);
});

// Duplicates an item with a photo, copying it twice into the copy's brand, and checks the copies are new photos with
// files of their own, which stay once the first item is deleted, and that a photo that doesn't exist is refused.
test("API: a duplicated item's photos are copies with files of their own", async () => {
  const first = (await call("POST", "/items", item([brand("DP-1", "Cobreq")]))).json();
  const photo = (await sendPhoto(first.id, first.brands[0].id)).json().brands[0].photos[0];
  const copy = (await call("POST", "/items", item([brand("DP-2", "Cobreq")]))).json();

  const copied = await copyPhotos(copy.id, copy.brands[0].id, [photo.id, photo.id]);
  assert.equal(copied.statusCode, 200);
  const rows = await prisma.itemPhoto.findMany({ where: { brandId: copy.brands[0].id }, orderBy: { position: "asc" } });
  assert.equal(rows.length, 2);
  assert.equal(rows.some((row) => row.id === photo.id), false);
  const [source] = await prisma.itemPhoto.findMany({ where: { id: photo.id } });
  const files = rows.flatMap((row) => [row.file, row.thumbFile]);
  assert.equal(new Set([...files, source.file, source.thumbFile]).size, 6);

  assert.equal((await call("DELETE", `/items/${first.id}`)).statusCode, 204);
  await Promise.all(files.map((file) => access(path.join(process.env.PHOTOS_DIR!, file))));
  const unknown = await copyPhotos(copy.id, copy.brands[0].id, [first.id]);
  assert.equal(unknown.statusCode, 400);
  assert.deepEqual(unknown.json().details, [{ field: "photos", message: "Copied photos must be saved photos." }]);
});

// Deletes an item whose brand has a photo, and checks the item, its brands and its photos are gone.
test("API: an item is deleted with its brands and their photos", async () => {
  const found = await find("bp2");
  assert.equal((await sendPhoto(found.id, found.brands[0].id)).statusCode, 200);
  assert.equal((await call("DELETE", `/items/${found.id}`)).statusCode, 204);
  assert.equal(await prisma.itemBrand.count({ where: { itemId: found.id } }), 0);
  assert.equal(await prisma.itemPhoto.count({ where: { brand: { itemId: found.id } } }), 0);
});

// Edits 20 items and logs in 10 times at once, as the phone and the desktop app can, and checks every request goes
// through: on SQLite, writes wait for each other instead of failing as busy.
test("API: concurrent edits and logins all go through", async () => {
  const found = await find("bp3");
  const edits = Array.from({ length: 20 }, (_, index) => call("PATCH", `/items/${found.id}`, { minQuantity: index }));
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
