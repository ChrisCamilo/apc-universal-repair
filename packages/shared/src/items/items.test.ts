import assert from "node:assert/strict";
import { test } from "node:test";
import {
  capitalizeFirst,
  codeKey,
  includeBoth,
  itemCreateSchema,
  itemListQuerySchema,
  searchKey,
  stockStatus,
} from "./items.ts";

// Capitalizes the first letter of text values, a single letter too, keeping the rest as typed.
test("Shared: text values start with a capital letter and keep the rest", () => {
  assert.equal(capitalizeFirst("  bomba d'água "), "Bomba d'água");
  assert.equal(capitalizeFirst("l"), "L");
  assert.equal(capitalizeFirst("ngk XR3"), "Ngk XR3");
  assert.equal(capitalizeFirst("NGK"), "NGK");
});

// Matches names ignoring case and accents, and part codes ignoring spaces and separators.
test("Shared: searches ignore accents in names and separators in codes", () => {
  assert.ok(searchKey("Bomba d'Água").includes(searchKey("AGUA")));
  assert.ok(codeKey("W 712/95").includes(codeKey("w712")));
  assert.equal(codeKey("ab-12.3/4"), "AB1234");
});

// Widens position and side filters with "Ambos" when a specific value is picked, and keeps "Ambos" or
// "N/A" alone exact.
test("Shared: Ambos matches a specific position or side", () => {
  assert.deepEqual(includeBoth(["D"], ["D", "T"]), ["D", "Ambos"]);
  assert.deepEqual(includeBoth(["LE", "N/A"], ["LD", "LE"]), ["LE", "N/A", "Ambos"]);
  assert.deepEqual(includeBoth(["Ambos"], ["D", "T"]), ["Ambos"]);
  assert.deepEqual(includeBoth(["N/A"], ["D", "T"]), ["N/A"]);
  assert.deepEqual(includeBoth(["D", "Ambos"], ["D", "T"]), ["D", "Ambos"]);
});

// Tells out of stock at zero, low at or under the minimum, and nothing above it.
test("Shared: stock status follows the quantity and the minimum", () => {
  assert.equal(stockStatus(0, 2), "out");
  assert.equal(stockStatus(2, 2), "low");
  assert.equal(stockStatus(3, 2), null);
  assert.equal(stockStatus(0, 0), "out");
});

// Reads a filter given once or repeated as a list, and leaves missing filters empty.
test("Shared: list filters accept one or several values", () => {
  const query = itemListQuerySchema.parse({ category: "Freios", position: ["D", "T"], status: "low" });
  assert.deepEqual(query.category, ["Freios"]);
  assert.deepEqual(query.position, ["D", "T"]);
  assert.deepEqual(query.color, []);
  assert.equal(itemListQuerySchema.safeParse({ status: "ok" }).success, false);
});

// Requires the name, code, category, brands and a price over zero, and leaves the rest optional.
test("Shared: new items need the required fields and a positive price", () => {
  const valid = { code: "w 712/95", name: "Filtro de óleo", category: "Motor", partBrand: "Mann", vehicleBrand: "Volkswagen", unitPriceCents: 3990 };
  assert.equal(itemCreateSchema.safeParse(valid).success, true);
  assert.equal(itemCreateSchema.safeParse({ ...valid, unitPriceCents: 0 }).success, false);
  assert.equal(itemCreateSchema.safeParse({ ...valid, name: "   " }).success, false);
  assert.equal(itemCreateSchema.safeParse({ ...valid, position: "Frente" }).success, false);
});
