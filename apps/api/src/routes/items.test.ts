import assert from "node:assert/strict";
import { after, test } from "node:test";
import { buildApp } from "../app.js";

// These requests are rejected by validation before any database call, so they run without a database.

const app = buildApp();

after(() => app.close());

// Sends a new item without a price and with a zero price and checks both are rejected with the field named.
test("API: creating an item needs a price above zero", async () => {
  const body = { code: "W 712/95", name: "Filtro", category: "Motor", partBrand: "Mann", vehicleBrand: "VW" };
  const missing = await app.inject({ method: "POST", url: "/items", payload: body });
  assert.equal(missing.statusCode, 400);
  assert.equal(missing.json().details[0].field, "unitPriceCents");

  const zero = await app.inject({ method: "POST", url: "/items", payload: { ...body, unitPriceCents: 0 } });
  assert.equal(zero.statusCode, 400);
});

// Asks for an unknown status and checks the list rejects it, naming the field.
test("API: list filters reject unknown status values", async () => {
  const status = await app.inject({ method: "GET", url: "/items?status=ok" });
  assert.equal(status.statusCode, 400);
  assert.equal(status.json().details[0].field, "status");
});

// Asks for a page size the list doesn't offer and for page 0, and checks both are rejected, naming the field.
test("API: the list takes only the offered page sizes", async () => {
  const size = await app.inject({ method: "GET", url: "/items?page=1&pageSize=30" });
  assert.equal(size.statusCode, 400);
  assert.equal(size.json().details[0].field, "pageSize");
  const page = await app.inject({ method: "GET", url: "/items?page=0&pageSize=25" });
  assert.equal(page.statusCode, 400);
  assert.equal(page.json().details[0].field, "page");
});

// Asks to sort by a column the list doesn't have and in an unknown direction, and checks both are rejected, naming
// the field.
test("API: the list sorts only by its columns", async () => {
  const column = await app.inject({ method: "GET", url: "/items?sort=code" });
  assert.equal(column.statusCode, 400);
  assert.equal(column.json().details[0].field, "sort");
  const order = await app.inject({ method: "GET", url: "/items?sort=price&order=up" });
  assert.equal(order.statusCode, 400);
  assert.equal(order.json().details[0].field, "order");
});

// Imports no items and an item without a price, and checks both are rejected, naming the field, before reaching the
// database.
test("API: an import takes valid items only", async () => {
  const empty = await app.inject({ method: "POST", url: "/items/import", payload: { items: [] } });
  assert.equal(empty.statusCode, 400);
  assert.equal(empty.json().details[0].field, "items");
  const item = { code: "A-1", name: "Junta", category: "Motor", partBrand: "Mann", vehicleBrand: "VW" };
  const priceless = await app.inject({ method: "POST", url: "/items/import", payload: { items: [item] } });
  assert.equal(priceless.statusCode, 400);
  assert.equal(priceless.json().details[0].field, "items/0/unitPriceCents");
});

// Edits and deletes with an id that isn't a UUID and checks they are rejected before reaching the database.
test("API: item routes reject ids that aren't UUIDs", async () => {
  const edit = await app.inject({ method: "PATCH", url: "/items/123", payload: { name: "Junta" } });
  const remove = await app.inject({ method: "DELETE", url: "/items/123" });
  assert.equal(edit.statusCode, 400);
  assert.equal(remove.statusCode, 400);
});
