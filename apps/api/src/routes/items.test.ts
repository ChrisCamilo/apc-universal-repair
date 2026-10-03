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

// Edits and deletes with an id that isn't a UUID and checks they are rejected before reaching the database.
test("API: item routes reject ids that aren't UUIDs", async () => {
  const edit = await app.inject({ method: "PATCH", url: "/items/123", payload: { name: "Junta" } });
  const remove = await app.inject({ method: "DELETE", url: "/items/123" });
  assert.equal(edit.statusCode, 400);
  assert.equal(remove.statusCode, 400);
});
