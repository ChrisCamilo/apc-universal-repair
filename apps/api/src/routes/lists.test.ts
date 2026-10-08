import assert from "node:assert/strict";
import { after, test } from "node:test";
import { buildApp } from "../app.js";

// These requests are rejected by validation before any database call, so they run without a database.

const app = buildApp();

after(() => app.close());

// Creates a category, a part brand and a vehicle brand with a blank name and checks each is rejected, naming the
// field.
test("API: creating in a list needs a name", async () => {
  for (const url of ["/categories", "/part-brands", "/vehicle-brands"]) {
    const blank = await app.inject({ method: "POST", url, payload: { name: "   " } });
    assert.equal(blank.statusCode, 400, url);
    assert.equal(blank.json().details[0].field, "name", url);
  }
});

// Creates a vehicle model without its vehicle brand and with a brand id that isn't a UUID, and checks both are
// rejected, naming the field.
test("API: a new vehicle model needs its vehicle brand", async () => {
  const missing = await app.inject({ method: "POST", url: "/vehicle-models", payload: { name: "Gol" } });
  assert.equal(missing.statusCode, 400);
  assert.equal(missing.json().details[0].field, "vehicleBrandId");
  const wrong = await app.inject({ method: "POST", url: "/vehicle-models", payload: { name: "Gol", vehicleBrandId: "vw" } });
  assert.equal(wrong.statusCode, 400);
});

// Renames and deletes with ids that aren't UUIDs, and renames to a blank name, and checks each is rejected before
// reaching the database.
test("API: renaming and deleting in a list check the id and the name", async () => {
  for (const url of ["/categories", "/part-brands", "/vehicle-brands", "/vehicle-models"]) {
    const rename = await app.inject({ method: "PATCH", url: `${url}/123`, payload: { name: "Motor" } });
    const remove = await app.inject({ method: "DELETE", url: `${url}/123` });
    const blank = await app.inject({ method: "PATCH", url: `${url}/00000000-0000-4000-8000-000000000001`, payload: { name: " " } });
    assert.deepEqual([rename.statusCode, remove.statusCode, blank.statusCode], [400, 400, 400], url);
    assert.equal(blank.json().details[0].field, "name", url);
  }
});
