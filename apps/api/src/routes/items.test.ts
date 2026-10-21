import assert from "node:assert/strict";
import { after, test } from "node:test";
import { buildApp } from "../app.js";
import { AUTHORIZED, TEST_SESSIONS } from "../sessions/testSessions.js";

// These requests are rejected by validation before any database call, so they run without a database, from the
// stand-in session.

const app = buildApp({ sessions: TEST_SESSIONS });

after(() => app.close());

/**
 * Builds the body of a new item of one brand, the brand's fields given.
 * @param brand The brand's fields to change.
 * @returns The body to send.
 */
function newItem(brand: object = {}) {
  return { name: "Filtro", category: "Motor", vehicleBrand: "VW", brands: [{ code: "W 712/95", partBrand: "Mann", unitPriceCents: 100, ...brand }] };
}

// Sends a new item whose brand has no price and a zero price, and one with no brand, and checks each is rejected with
// the field named.
test("API: creating an item needs a brand with a price above zero", async () => {
  const missing = await app.inject({ headers: AUTHORIZED, method: "POST", url: "/items", payload: newItem({ unitPriceCents: undefined }) });
  assert.equal(missing.statusCode, 400);
  assert.equal(missing.json().details[0].field, "brands/0/unitPriceCents");

  const zero = await app.inject({ headers: AUTHORIZED, method: "POST", url: "/items", payload: newItem({ unitPriceCents: 0 }) });
  assert.equal(zero.statusCode, 400);
  const brandless = await app.inject({ headers: AUTHORIZED, method: "POST", url: "/items", payload: { ...newItem(), brands: [] } });
  assert.equal(brandless.statusCode, 400);
  assert.equal(brandless.json().details[0].field, "brands");
});

// Sends a new item whose two brands share a part brand, and one whose brands share a code with other separators,
// and checks each is rejected naming the second brand's field, before reaching the database.
test("API: an item's brands repeat neither a part brand nor a code", async () => {
  const [brand] = newItem().brands;
  const brands = await app.inject({
    headers: AUTHORIZED,
    method: "POST",
    url: "/items",
    payload: { ...newItem(), brands: [brand, { ...brand, code: "OTHER" }] },
  });
  assert.equal(brands.statusCode, 400);
  assert.equal(brands.json().details[0].field, "brands/1/partBrand");
  const codes = await app.inject({
    headers: AUTHORIZED,
    method: "POST",
    url: "/items",
    payload: { ...newItem(), brands: [brand, { ...brand, partBrand: "Tecfil", code: "w712-95" }] },
  });
  assert.equal(codes.statusCode, 400);
  assert.equal(codes.json().details[0].field, "brands/1/code");
});

// Creates and imports items priced past a million and checks both are rejected, naming the field.
test("API: prices can't pass a million", async () => {
  const body = newItem({ unitPriceCents: 100_000_001 });
  const created = await app.inject({ headers: AUTHORIZED, method: "POST", url: "/items", payload: body });
  assert.equal(created.statusCode, 400);
  assert.equal(created.json().details[0].field, "brands/0/unitPriceCents");
  const imported = await app.inject({ headers: AUTHORIZED, method: "POST", url: "/items/import", payload: { items: [body] } });
  assert.equal(imported.statusCode, 400);
  assert.equal(imported.json().details[0].field, "items/0/brands/0/unitPriceCents");
});

// Creates, edits and imports items with quantities past a million and checks each is rejected, naming the field.
test("API: quantities can't pass a million", async () => {
  const created = await app.inject({ headers: AUTHORIZED, method: "POST", url: "/items", payload: newItem({ quantity: 1_000_001 }) });
  assert.equal(created.statusCode, 400);
  assert.equal(created.json().details[0].field, "brands/0/quantity");
  const id = "00000000-0000-4000-8000-000000000001";
  const edited = await app.inject({ headers: AUTHORIZED, method: "PATCH", url: `/items/${id}`, payload: { minQuantity: 2_147_483_648 } });
  assert.equal(edited.statusCode, 400);
  assert.equal(edited.json().details[0].field, "minQuantity");
  const imported = await app.inject({
    headers: AUTHORIZED,
    method: "POST",
    url: "/items/import",
    payload: { items: [newItem({ quantity: 1_000_001 })] },
  });
  assert.equal(imported.statusCode, 400);
  assert.equal(imported.json().details[0].field, "items/0/brands/0/quantity");
});

// Asks for an unknown status and checks the list rejects it, naming the field.
test("API: list filters reject unknown status values", async () => {
  const status = await app.inject({ headers: AUTHORIZED, method: "GET", url: "/items?status=ok" });
  assert.equal(status.statusCode, 400);
  assert.equal(status.json().details[0].field, "status");
});

// Asks for a page size the list doesn't offer and for page 0, and checks both are rejected, naming the field.
test("API: the list takes only the offered page sizes", async () => {
  const size = await app.inject({ headers: AUTHORIZED, method: "GET", url: "/items?page=1&pageSize=30" });
  assert.equal(size.statusCode, 400);
  assert.equal(size.json().details[0].field, "pageSize");
  const page = await app.inject({ headers: AUTHORIZED, method: "GET", url: "/items?page=0&pageSize=25" });
  assert.equal(page.statusCode, 400);
  assert.equal(page.json().details[0].field, "page");
});

// Asks to sort by a column the list doesn't have and in an unknown direction, and checks both are rejected, naming
// the field.
test("API: the list sorts only by its columns", async () => {
  const column = await app.inject({ headers: AUTHORIZED, method: "GET", url: "/items?sort=code" });
  assert.equal(column.statusCode, 400);
  assert.equal(column.json().details[0].field, "sort");
  const order = await app.inject({ headers: AUTHORIZED, method: "GET", url: "/items?sort=price&order=up" });
  assert.equal(order.statusCode, 400);
  assert.equal(order.json().details[0].field, "order");
});

// Imports no items and an item without a price, and checks both are rejected, naming the field, before reaching the
// database.
test("API: an import takes valid items only", async () => {
  const empty = await app.inject({ headers: AUTHORIZED, method: "POST", url: "/items/import", payload: { items: [] } });
  assert.equal(empty.statusCode, 400);
  assert.equal(empty.json().details[0].field, "items");
  const priceless = await app.inject({
    headers: AUTHORIZED,
    method: "POST",
    url: "/items/import",
    payload: { items: [newItem({ unitPriceCents: undefined })] },
  });
  assert.equal(priceless.statusCode, 400);
  assert.equal(priceless.json().details[0].field, "items/0/brands/0/unitPriceCents");
});

// Edits and deletes with an id that isn't a UUID and checks they are rejected before reaching the database.
test("API: item routes reject ids that aren't UUIDs", async () => {
  const edit = await app.inject({ headers: AUTHORIZED, method: "PATCH", url: "/items/123", payload: { name: "Junta" } });
  const remove = await app.inject({ headers: AUTHORIZED, method: "DELETE", url: "/items/123" });
  assert.equal(edit.statusCode, 400);
  assert.equal(remove.statusCode, 400);
});
