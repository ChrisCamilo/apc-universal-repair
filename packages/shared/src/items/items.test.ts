import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allCodes,
  brandsValue,
  capitalizeFirst,
  codeKey,
  findOption,
  formatPrice,
  formatPriceRange,
  includeBoth,
  itemCodes,
  itemCreateSchema,
  itemDetails,
  itemListQuerySchema,
  itemUpdateSchema,
  itemVehiclesLabel,
  itemVehiclesText,
  matchesSearch,
  matchingOptions,
  MIXED_VALUES,
  optionKey,
  partBrandsLabel,
  resultSummary,
  searchKey,
  sortableOf,
  sortItems,
  stockStatus,
  type SortableItem,
} from "./items.ts";
import { testItem } from "./testItems.ts";

// A part made by three brands, which differ in code, price, color and location.
const PADS = testItem({
  name: "Pastilha de freio",
  category: "Freios",
  vehicleBrand: "Volkswagen",
  vehicleModel: "Gol",
  position: "D",
  brands: [
    { id: "00000000-0000-4000-8000-000000000001", partBrand: "Cobreq", code: "N-1210", color: "N/A", location: "B-12", quantity: 2, unitPriceCents: 7990, photos: [] },
    { id: "00000000-0000-4000-8000-000000000002", partBrand: "Fras-le", code: "PD/1210", color: "N/A", location: "B-12", quantity: 1, unitPriceCents: 9490, photos: [] },
    { id: "00000000-0000-4000-8000-000000000003", partBrand: "Bosch", code: "BB 1210", color: "Preto", location: "B-13", quantity: 0, unitPriceCents: 11290, photos: [] },
  ],
});

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

// Reads the page and the page size as they come in a URL, and checks only 25, 50 and 100 are page sizes and pages
// start at 1.
test("Shared: the list query takes a page of 25, 50 or 100 items", () => {
  assert.deepEqual(itemListQuerySchema.parse({ page: "2", pageSize: "50" }), {
    ...itemListQuerySchema.parse({}),
    page: 2,
    pageSize: 50,
  });
  for (const pageSize of ["10", "30", "200", "abc"]) {
    assert.equal(itemListQuerySchema.safeParse({ pageSize }).success, false, pageSize);
  }
  assert.equal(itemListQuerySchema.safeParse({ page: "0", pageSize: "25" }).success, false);
});

// Requires the name, category, vehicle brand and a brand with its code, part brand and a price over zero, and leaves
// the rest optional; an item needs a brand, and its brands can't repeat a part brand or a code as the search compares
// them.
test("Shared: new items need the required fields, a brand and a positive price", () => {
  const brand = { code: "w 712/95", partBrand: "Mann", unitPriceCents: 3990 };
  const valid = { name: "Filtro de óleo", category: "Motor", vehicles: [{ vehicleBrand: "Volkswagen" }], brands: [brand] };
  assert.equal(itemCreateSchema.safeParse(valid).success, true);
  assert.equal(itemCreateSchema.safeParse({ ...valid, brands: [{ ...brand, unitPriceCents: 0 }] }).success, false);
  assert.equal(itemCreateSchema.safeParse({ ...valid, name: "   " }).success, false);
  assert.equal(itemCreateSchema.safeParse({ ...valid, brands: [] }).success, false);
  const twoBrands = itemCreateSchema.safeParse({ ...valid, brands: [brand, { ...brand, code: "W71295-B", partBrand: " mann " }] });
  assert.deepEqual(twoBrands.error?.issues.map((issue) => issue.path), [["brands", 1, "partBrand"]]);
  const twoCodes = itemCreateSchema.safeParse({ ...valid, brands: [brand, { ...brand, code: "W712-95", partBrand: "Tecfil" }] });
  assert.deepEqual(twoCodes.error?.issues.map((issue) => issue.path), [["brands", 1, "code"]]);
  assert.equal(itemCreateSchema.safeParse({ ...valid, brands: [brand, { ...brand, code: "C 2433", partBrand: "Tecfil" }] }).success, true);
  assert.equal(itemCreateSchema.safeParse({ ...valid, position: "Frente" }).success, false);
});

// Sends items with original codes and checks they are optional, each is taken once as the search compares codes, one
// can't be a code of one of the item's brands too, and an edit sending only some of the fields is checked the same.
test("Shared: an item's original codes are each used once in it", () => {
  const brand = { code: "W 712/95", partBrand: "Mann", unitPriceCents: 3990 };
  const valid = { name: "Filtro de óleo", category: "Motor", vehicles: [{ vehicleBrand: "Volkswagen" }], brands: [brand] };
  assert.equal(itemCreateSchema.safeParse({ ...valid, originalCodes: ["030 115 561 AN", "030115561AP"] }).success, true);
  const repeated = itemCreateSchema.safeParse({ ...valid, originalCodes: ["030 115 561 AN", "030-115-561-an"] });
  assert.deepEqual(repeated.error?.issues.map((issue) => issue.path), [["originalCodes", 1]]);
  const aBrands = itemCreateSchema.safeParse({ ...valid, originalCodes: ["X-1", "w712/95"] });
  assert.deepEqual(aBrands.error?.issues.map((issue) => issue.path), [["originalCodes", 1]]);
  assert.equal(itemCreateSchema.safeParse({ ...valid, originalCodes: [" "] }).success, false);
  assert.equal(itemUpdateSchema.safeParse({ originalCodes: ["W 712/95"] }).success, true);
  assert.equal(itemUpdateSchema.safeParse({ originalCodes: ["W 712/95"], brands: [brand] }).success, false);
});

// Sends items with several vehicles and checks one is needed, a model is optional, a vehicle written twice otherwise
// is refused on its place, and Universal stands alone.
test("Shared: an item fits at least one vehicle, each once and Universal alone", () => {
  const brand = { code: "W 712/95", partBrand: "Mann", unitPriceCents: 3990 };
  const item = (vehicles: object[]) => itemCreateSchema.safeParse({ name: "Filtro", category: "Motor", vehicles, brands: [brand] });
  assert.equal(item([{ vehicleBrand: "Volkswagen", vehicleModel: "Gol" }, { vehicleBrand: "Volkswagen" }]).success, true);
  assert.equal(item([]).success, false);
  assert.deepEqual(item([{ vehicleBrand: "Fiat", vehicleModel: "Uno" }, { vehicleBrand: " fiat ", vehicleModel: "UNO" }]).error?.issues.map((issue) => issue.path), [
    ["vehicles", 1],
  ]);
  assert.deepEqual(item([{ vehicleBrand: "Universal" }, { vehicleBrand: "Fiat" }]).error?.issues.map((issue) => issue.path), [
    ["vehicles", 0, "vehicleBrand"],
  ]);
  assert.equal(item([{ vehicleBrand: "Universal" }]).success, true);
});

// Finds items by name ignoring case and accents and by any brand's part code or original code ignoring separators,
// and keeps every item for an empty search; every code is listed, the brands' first.
test("Shared: the item search matches names and part codes", () => {
  const item = { name: "Bomba d'água", originalCodes: ["030 121 008 C"], brands: [{ code: "X-1" }, { code: "W 712/95" }] };
  assert.deepEqual(allCodes(item), ["X-1", "W 712/95", "030 121 008 C"]);
  assert.equal(matchesSearch(item, "AGUA"), true);
  assert.equal(matchesSearch(item, "w712"), true);
  assert.equal(matchesSearch(item, "030121"), true);
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

// Writes an item's details in one line, leaving out N/A values and a missing vehicle model or location, and an item of
// several vehicles with its first and how many more, as its row does.
test("Shared: item details fit in one line without what doesn't apply", () => {
  const details = itemDetails({
    category: "Freios",
    vehicles: [{ vehicleBrand: "Chevrolet", vehicleModel: null }],
    position: "D",
    side: "N/A",
    brands: [{ partBrand: "Cobreq", color: "N/A", location: null, unitPriceCents: 8990 }],
  });
  assert.equal(details.replace(/\s/g, " "), "Freios · Cobreq · Chevrolet · D · R$ 89,90");
  assert.equal(itemDetails(PADS).replace(/\s/g, " "), "Freios · Cobreq +2 · Volkswagen Gol · D · Várias · Várias · R$ 79,90 – R$ 112,90");
  const both = { vehicles: [{ vehicleBrand: "Volkswagen", vehicleModel: "Gol G5" }, { vehicleBrand: "Volkswagen", vehicleModel: null }] };
  assert.equal(itemVehiclesLabel(both), "Volkswagen Gol G5 +1");
  assert.equal(itemVehiclesText(both), "Volkswagen Gol G5, Volkswagen");
  assert.equal(itemVehiclesLabel(PADS), "Volkswagen Gol");
});

// Reads an item of three brands for its row: the first code and part brand with how many more, a value the brands
// share or "Várias", and the price from the lowest to the highest; one brand reads as itself.
test("Shared: an item's brands read as one value for its row", () => {
  assert.equal(itemCodes(PADS), "N-1210 +2");
  assert.equal(partBrandsLabel(PADS), "Cobreq +2");
  assert.equal(brandsValue(PADS, "color"), MIXED_VALUES);
  assert.equal(brandsValue({ brands: PADS.brands.slice(0, 2) }, "location"), "B-12");
  assert.equal(formatPriceRange(PADS).replace(/\s/g, " "), "R$ 79,90 – R$ 112,90");
  const one = testItem({ code: "W 712/95", partBrand: "Mann", unitPriceCents: 3990 });
  assert.deepEqual([itemCodes(one), partBrandsLabel(one), formatPriceRange(one).replace(/\s/g, " ")], ["W 712/95", "Mann", "R$ 39,90"]);
});

// Reads what an item of three brands sorts by: its first brand's code, part brand, color and location, its lowest
// price and its brands' total quantity.
test("Shared: an item sorts by its first brand and its lowest price", () => {
  assert.deepEqual(sortableOf(PADS), {
    name: "Pastilha de freio",
    category: "Freios",
    vehicleBrand: "Volkswagen",
    vehicleModel: "Gol",
    position: "D",
    side: "N/A",
    quantity: 3,
    code: "N-1210",
    partBrand: "Cobreq",
    color: "N/A",
    location: "B-12",
    unitPriceCents: 7990,
  });
});

// Finds the option a typed text names whatever its case, accents or spaces, and nothing for a new value.
test("Shared: typed text maps to the existing option's spelling", () => {
  const options = ["Arrefecimento", "Elétrica", "Freios"];
  assert.equal(findOption(options, "  freios "), "Freios");
  assert.equal(findOption(options, "ELETRICA"), "Elétrica");
  assert.equal(findOption(options, "Freio"), undefined);
  assert.equal(findOption(options, ""), undefined);
});

// Reduces names that differ only in case, accents and spaces to one key, and keeps different names apart.
test("Shared: option names are told apart ignoring case, accents and extra spaces", () => {
  assert.equal(optionKey("  Motor   DIESEL "), "motor diesel");
  assert.equal(optionKey("Elétrica"), optionKey("eletrica"));
  assert.notEqual(optionKey("Freio"), optionKey("Freios"));
});

// Lists every option for an empty text or one that names an option, and otherwise the ones containing it.
test("Shared: the combobox list filters by the typed text", () => {
  const options = ["Arrefecimento", "Elétrica", "Freios", "Ignição"];
  assert.deepEqual(matchingOptions(options, ""), options);
  assert.deepEqual(matchingOptions(options, "freios"), options);
  assert.deepEqual(matchingOptions(options, "ic"), ["Elétrica", "Ignição"]);
  assert.deepEqual(matchingOptions(options, "suspensão"), []);
});

/**
 * Fills in a sortable item with the fields a sort test doesn't look at.
 * @param fields The fields that matter here.
 * @returns An item to sort.
 */
function sortable(fields: Partial<SortableItem> & Pick<SortableItem, "code">): SortableItem {
  return {
    name: "Peça",
    category: "Motor",
    partBrand: "Bosch",
    vehicleBrand: "Volkswagen",
    vehicleModel: null,
    position: "N/A",
    side: "N/A",
    color: "N/A",
    location: null,
    unitPriceCents: 100,
    quantity: 1,
    ...fields,
  };
}

// Sorts locations with numbers in place and names ignoring case and accents, ascending and descending.
test("Shared: text columns sort in pt-BR order with numbers in place", () => {
  const items = [sortable({ code: "1", location: "A-10" }), sortable({ code: "2", location: "A-2" }), sortable({ code: "3", location: "a-1" })];
  assert.deepEqual(
    sortItems(items, { key: "location", dir: "asc" }).map((item) => item.location),
    ["a-1", "A-2", "A-10"],
  );
  const names = [sortable({ code: "1", name: "Óleo" }), sortable({ code: "2", name: "junta" }), sortable({ code: "3", name: "Bomba" })];
  assert.deepEqual(
    sortItems(names, { key: "name", dir: "desc" }).map((item) => item.name),
    ["Óleo", "junta", "Bomba"],
  );
});

// Sorts by price by value, not as text, and checks ties keep the part code order in both directions.
test("Shared: number columns sort by value and ties keep the code order", () => {
  const items = [
    sortable({ code: "C-3", unitPriceCents: 900 }),
    sortable({ code: "B-2", unitPriceCents: 10000 }),
    sortable({ code: "A-1", unitPriceCents: 900 }),
  ];
  assert.deepEqual(
    sortItems(items, { key: "price", dir: "asc" }).map((item) => item.code),
    ["A-1", "C-3", "B-2"],
  );
  assert.deepEqual(
    sortItems(items, { key: "price", dir: "desc" }).map((item) => item.code),
    ["B-2", "A-1", "C-3"],
  );
});

// Sorts by vehicle and checks the brand comes first, then the model, an item for any model before the others.
test("Shared: the vehicle sorts by brand, then model", () => {
  const items = [
    sortable({ code: "1", vehicleBrand: "Volkswagen", vehicleModel: "Santana" }),
    sortable({ code: "2", vehicleBrand: "Chevrolet", vehicleModel: "Opala" }),
    sortable({ code: "3", vehicleBrand: "Volkswagen", vehicleModel: "Gol" }),
    sortable({ code: "4", vehicleBrand: "Volkswagen", vehicleModel: null }),
  ];
  assert.deepEqual(
    sortItems(items, { key: "vehicle", dir: "asc" }).map((item) => item.code),
    ["2", "4", "3", "1"],
  );
});

// Checks the list query takes a known column and direction, and refuses an unknown column.
test("Shared: the list query sorts by a known column", () => {
  const sorted = itemListQuerySchema.parse({ sort: "price", order: "desc" });
  assert.deepEqual([sorted.sort, sorted.order], ["price", "desc"]);
  assert.equal(itemListQuerySchema.safeParse({ sort: "code" }).success, false);
  assert.equal(itemListQuerySchema.safeParse({ sort: "name", order: "up" }).success, false);
});
