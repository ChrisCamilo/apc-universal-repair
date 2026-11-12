import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { optionKey } from "./items.ts";
import { STARTING_VEHICLE_BRANDS, VEHICLE_BRAND_ALIASES } from "./vehicleLists.ts";

// Checks the vehicle lists a server starts with: each brand once and each model once in its brand, with their names
// written with no stray spaces. A brand may have no model yet, when none of its models could be confirmed.
test("Shared: the starting vehicle lists hold each brand and model once, written cleanly", () => {
  const brandKeys = STARTING_VEHICLE_BRANDS.map((brand) => optionKey(brand.name));
  assert.equal(new Set(brandKeys).size, brandKeys.length);
  for (const brand of STARTING_VEHICLE_BRANDS) {
    const modelKeys = brand.models.map(optionKey);
    assert.equal(new Set(modelKeys).size, modelKeys.length, brand.name);
    for (const name of [brand.name, ...brand.models]) {
      assert.equal(name, name.trim().replace(/\s+/g, " "), name);
      assert.notEqual(name, "");
    }
  }
});

// Checks each brand typed under another name ("GM", "VW") points at a listed brand, and that no alias is the key of a
// listed brand, which the migration would otherwise merge into itself.
test("Shared: each brand alias points at a listed brand and isn't one itself", () => {
  const brandKeys = new Set(STARTING_VEHICLE_BRANDS.map((brand) => optionKey(brand.name)));
  for (const [alias, standard] of Object.entries(VEHICLE_BRAND_ALIASES)) {
    assert.ok(brandKeys.has(optionKey(standard)), `${alias} -> ${standard}`);
    assert.ok(!brandKeys.has(optionKey(alias)), alias);
  }
});

// Checks docs/vehicle-lists.md lists the same brands and models, each brand's row in both languages holding exactly its
// models, so the page never says something the servers don't start with.
test("Shared: docs/vehicle-lists.md lists every starting brand with its models", () => {
  const doc = readFileSync(new URL("../../../../docs/vehicle-lists.md", import.meta.url), "utf8");
  for (const brand of STARTING_VEHICLE_BRANDS) {
    const rows = doc.split(/\r?\n/).filter((line) => line.startsWith(`| ${brand.name} |`));
    assert.equal(rows.length, 2, brand.name);
    for (const row of rows) {
      assert.equal(row, `| ${brand.name} | ${brand.models.length > 0 ? brand.models.join(", ") : "—"} |`);
    }
  }
});
