import assert from "node:assert/strict";
import { test } from "node:test";
import {
  capitalizeFirst,
  codeKey,
  findOption,
  formatPrice,
  includeBoth,
  itemCreateSchema,
  itemDetails,
  itemListQuerySchema,
  matchesSearch,
  matchingOptions,
  resultSummary,
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

// Finds items by name ignoring case and accents and by part code ignoring separators, and keeps every item
// for an empty search.
test("Shared: the item search matches names and part codes", () => {
  const item = { name: "Bomba d'água", code: "W 712/95" };
  assert.equal(matchesSearch(item, "AGUA"), true);
  assert.equal(matchesSearch(item, "w712"), true);
  assert.equal(matchesSearch(item, "  "), true);
  assert.equal(matchesSearch(item, "freio"), false);
  assert.equal(matchesSearch(item, "-"), false);
});

// Writes prices in reais with the Brazilian separators.
test("Shared: prices are written in reais", () => {
  assert.equal(formatPrice(123456).replace(/\s/g, " "), "R$ 1.234,56");
  assert.equal(formatPrice(990).replace(/\s/g, " "), "R$ 9,90");
});

// Counts the items shown of the total and the low and out-of-stock items, in singular and plural.
test("Shared: the result counter shows totals and stock alerts", () => {
  const items = [
    { quantity: 0, minQuantity: 2 },
    { quantity: 2, minQuantity: 2 },
    { quantity: 1, minQuantity: 3 },
    { quantity: 9, minQuantity: 2 },
  ];
  assert.equal(resultSummary(3, items), "3 de 4 itens · 2 baixos · 1 esgotado");
  assert.equal(resultSummary(1, [{ quantity: 5, minQuantity: 1 }]), "1 de 1 item · 0 baixos · 0 esgotados");
});

// Writes an item's details in one line, leaving out N/A values and a missing vehicle model or location.
test("Shared: item details fit in one line without what doesn't apply", () => {
  const details = itemDetails({
    category: "Freios",
    partBrand: "Cobreq",
    vehicleBrand: "Chevrolet",
    vehicleModel: null,
    position: "D",
    side: "N/A",
    color: "N/A",
    location: null,
    unitPriceCents: 8990,
  });
  assert.equal(details.replace(/\s/g, " "), "Freios · Cobreq · Chevrolet · D · R$ 89,90");
});

// Finds the option a typed text names whatever its case, accents or spaces, and nothing for a new value.
test("Shared: typed text maps to the existing option's spelling", () => {
  const options = ["Arrefecimento", "Elétrica", "Freios"];
  assert.equal(findOption(options, "  freios "), "Freios");
  assert.equal(findOption(options, "ELETRICA"), "Elétrica");
  assert.equal(findOption(options, "Freio"), undefined);
  assert.equal(findOption(options, ""), undefined);
});

// Lists every option for an empty text or one that names an option, and otherwise the ones containing it.
test("Shared: the combobox list filters by the typed text", () => {
  const options = ["Arrefecimento", "Elétrica", "Freios", "Ignição"];
  assert.deepEqual(matchingOptions(options, ""), options);
  assert.deepEqual(matchingOptions(options, "freios"), options);
  assert.deepEqual(matchingOptions(options, "ic"), ["Elétrica", "Ignição"]);
  assert.deepEqual(matchingOptions(options, "suspensão"), []);
});
