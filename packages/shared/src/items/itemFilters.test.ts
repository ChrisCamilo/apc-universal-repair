import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPTY_ITEM_FILTERS,
  followEntryChange,
  itemFilterOptions,
  itemFilterRows,
  itemListQuery,
  itemMatchesQuery,
  POSITION_FILTERS,
  SIDE_FILTERS,
  splitVehicleModel,
  vehicleModelLabel,
  vehicleModelValue,
} from "./itemFilters.ts";
import { itemListQuerySchema, type Item } from "./items.ts";
import { testItem, type FlatItem } from "./testItems.ts";

const ITEMS = [
  item({ category: "Motor", partBrand: "Mann", vehicleBrand: "Chevrolet", vehicleModel: "Opala 4.1", color: "Preto", location: "A-2" }),
  item({ category: "Freios", partBrand: "Cobreq", vehicleBrand: "Volkswagen", vehicleModel: "Gol", location: null }),
  item({ category: "motor", partBrand: "Bosch", vehicleBrand: "Fiat", vehicleModel: "Uno", color: "Azul", location: "B-1" }),
  item({ category: "Suspensão", partBrand: "Cofap", vehicleBrand: "Chevrolet", vehicleModel: "Chevette", location: "A-2" }),
  item({ category: "Motor", partBrand: "Mann", vehicleBrand: "Ford", vehicleModel: "Gol", location: "C-1" }),
  item({ category: "Motor", partBrand: "Mann", vehicleBrand: "Ford", vehicleModel: null }),
  item({
    category: "Motor",
    partBrand: "Mann",
    vehicles: [
      { vehicleBrand: "Ford", vehicleModel: null },
      { vehicleBrand: "Renault", vehicleModel: "Clio" },
    ],
  }),
];

/**
 * Fills in an item with the fields the filters don't look at.
 * @param fields The fields that matter here.
 * @returns A complete item.
 */
function item(fields: FlatItem): Item {
  return testItem({
    id: "00000000-0000-4000-8000-000000000001",
    code: "X-1",
    name: "Peça",
    category: "Motor",
    partBrand: "Bosch",
    vehicleBrand: "Volkswagen",
    vehicleModel: null,
    position: "N/A",
    side: "N/A",
    color: "N/A",
    location: null,
    quantity: 1,
    minQuantity: 0,
    unitPriceCents: 100,
    photos: [],
    createdAt: "2026-10-03T12:00:00.000Z",
    updatedAt: "2026-10-03T12:00:00.000Z",
    ...fields,
  });
}

// Lists the options from the items in stock and checks each list is distinct and sorted, the colors in use come
// after N/A, the locations leave the items without one out, the vehicle brands and models come from every vehicle of
// an item, and the vehicle models carry their brand, two brands' "Gol" apart, sorted by how they read.
test("Shared: the filters offer what is in stock", () => {
  const options = itemFilterOptions(ITEMS, []);
  assert.deepEqual(options.categories, ["Freios", "Motor", "Suspensão"]);
  assert.deepEqual(options.partBrands, ["Bosch", "Cobreq", "Cofap", "Mann"]);
  assert.deepEqual(options.vehicleBrands, ["Chevrolet", "Fiat", "Ford", "Renault", "Volkswagen"]);
  assert.deepEqual(options.colors, ["N/A", "Azul", "Preto"]);
  assert.deepEqual(options.locations, ["A-2", "B-1", "C-1"]);
  assert.deepEqual(
    options.vehicleModels.map((model) => model.label),
    ["Chevette · Chevrolet", "Clio · Renault", "Gol · Ford", "Gol · Volkswagen", "Opala 4.1 · Chevrolet", "Uno · Fiat"],
  );
});

// Chooses vehicle brands and checks only their models are offered.
test("Shared: chosen vehicle brands narrow the vehicle models", () => {
  const options = itemFilterOptions(ITEMS, ["Chevrolet", "Ford"]);
  assert.deepEqual(
    options.vehicleModels,
    [
      { value: "Chevrolet|Chevette", label: "Chevette · Chevrolet" },
      { value: "Ford|Gol", label: "Gol · Ford" },
      { value: "Chevrolet|Opala 4.1", label: "Opala 4.1 · Chevrolet" },
    ],
  );
});

// Keeps a model with its brand in one value and reads both back, and checks a value without a brand isn't one.
test("Shared: a vehicle model value keeps its brand", () => {
  const value = vehicleModelValue("Chevrolet", "Opala 4.1");
  assert.deepEqual(splitVehicleModel(value), { vehicleBrand: "Chevrolet", vehicleModel: "Opala 4.1" });
  assert.equal(vehicleModelLabel(value), "Opala 4.1 · Chevrolet");
  assert.equal(splitVehicleModel("Opala 4.1"), null);
});

// Checks the position and side chips are the specific values and N/A, each with its full name as a tooltip.
test("Shared: position and side chips name their values in full", () => {
  assert.deepEqual(
    POSITION_FILTERS.map((chip) => [chip.label, chip.title]),
    [["D", "Dianteiro"], ["T", "Traseiro"], ["N/A", "Posição não se aplica"]],
  );
  assert.deepEqual(
    SIDE_FILTERS.map((chip) => [chip.label, chip.title]),
    [["LD", "Lado direito"], ["LE", "Lado esquerdo"], ["N/A", "Lado não se aplica"]],
  );
});

// Writes the query of two categories, a vehicle model and the low stock status, and checks each value is its own
// parameter; with nothing chosen, the query is empty; the search, the page and the sort follow the filters.
test("Shared: the list query sends each chosen value", () => {
  const filters = { ...EMPTY_ITEM_FILTERS, category: ["Freios", "Motor"], vehicleModel: ["Chevrolet|Opala 4.1"] };
  assert.equal(itemListQuery(filters, "low"), "category=Freios&category=Motor&vehicleModel=Chevrolet%7COpala+4.1&status=low");
  assert.equal(itemListQuery(EMPTY_ITEM_FILTERS, null), "");
  assert.equal(
    itemListQuery(EMPTY_ITEM_FILTERS, null, { search: " vela ", page: 2, pageSize: 50 }),
    "q=vela&page=2&pageSize=50",
  );
  assert.equal(
    itemListQuery(EMPTY_ITEM_FILTERS, null, { page: 1, pageSize: 25, sort: { key: "price", dir: "desc" } }),
    "page=1&pageSize=25&sort=price&order=desc",
  );
});

// Lays out the menu with a Ford chosen and checks the seven rows in order, position and side sharing a row of chips,
// and the vehicle models narrowed to Ford.
test("Shared: the filter menu has seven rows, models following the brands", () => {
  const rows = itemFilterRows(ITEMS, { ...EMPTY_ITEM_FILTERS, vehicleBrand: ["Ford"] });
  assert.deepEqual(
    rows.map((row) => row.label),
    ["Categoria", "Marca da peça", "Marca do veículo", "Modelo do veículo", "Posição · Lado", "Cor", "Local"],
  );
  const models = rows[3];
  assert.ok("options" in models);
  assert.deepEqual(models.options, [{ value: "Ford|Gol", label: "Gol · Ford" }]);
  const chips = rows[4];
  assert.ok("groups" in chips);
  assert.deepEqual(chips.groups.map((group) => group.key), ["position", "side"]);
});

// Renames and merges entries the filters name, in another spelling, and checks each value follows, a vehicle brand
// taking its models along, a model only within its brand, and a value that repeats after a merge kept once; a change
// to an entry no filter names leaves them as they are.
test("Shared: the filters follow an entry renamed or merged", () => {
  const filters = {
    ...EMPTY_ITEM_FILTERS,
    category: ["Parachoque", "Motor"],
    vehicleBrand: ["GM", "Fiat"],
    vehicleModel: [vehicleModelValue("GM", "Opala"), vehicleModelValue("Fiat", "Uno"), vehicleModelValue("Chevrolet", "Opala")],
  };
  assert.deepEqual(followEntryChange(filters, { kind: "categories", from: "parachoque", to: "Para-choque" }).category, ["Para-choque", "Motor"]);
  assert.deepEqual(followEntryChange(filters, { kind: "categories", from: "Parachoque", to: "Motor" }).category, ["Motor"]);
  const brands = followEntryChange(filters, { kind: "vehicleBrands", from: "GM", to: "Chevrolet" });
  assert.deepEqual(brands.vehicleBrand, ["Chevrolet", "Fiat"]);
  assert.deepEqual(brands.vehicleModel, [vehicleModelValue("Chevrolet", "Opala"), vehicleModelValue("Fiat", "Uno")]);
  const models = followEntryChange(filters, { kind: "vehicleModels", from: "Opala", to: "Opala 4.1", vehicleBrand: "GM" });
  assert.deepEqual(models.vehicleModel, [
    vehicleModelValue("GM", "Opala 4.1"),
    vehicleModelValue("Fiat", "Uno"),
    vehicleModelValue("Chevrolet", "Opala"),
  ]);
  assert.deepEqual(followEntryChange(filters, { kind: "partBrands", from: "Mann", to: "Mann-Filter" }), filters);
});

// Reads list queries on a few items as the API's GET /items would choose them: the search by name or any code, each
// filter by any of its values, "Ambos" fitting a specific position or side, vehicles and brands by any of theirs, a
// model with its brand, and the stock status.
test("Shared: an item matches a list query as the API chooses it", () => {
  const pads = testItem({
    name: "Pastilha de freio",
    category: "Freios",
    position: "D",
    side: "Ambos",
    minQuantity: 4,
    originalCodes: ["5U0 698 151"],
    vehicles: [
      { vehicleBrand: "Volkswagen", vehicleModel: "Gol" },
      { vehicleBrand: "Chevrolet", vehicleModel: null },
    ],
    brands: [
      { id: "00000000-0000-4000-b000-000000000001", partBrand: "Cobreq", code: "N-1210", color: "N/A", location: "A-2", quantity: 3, unitPriceCents: 8990, photos: [] },
      { id: "00000000-0000-4000-b000-000000000002", partBrand: "Fras-le", code: "PD/1210", color: "Preto", location: null, quantity: 0, unitPriceCents: 9990, photos: [] },
    ],
  });
  const empty = testItem({ name: "Bomba d'água", category: "Arrefecimento", position: "Ambos", quantity: 0, minQuantity: 2 });
  const match = (item: Item, query: Record<string, unknown>) => itemMatchesQuery(item, itemListQuerySchema.parse(query));
  assert.equal(match(pads, {}), true);
  assert.equal(match(pads, { q: "pastilha" }), true);
  assert.equal(match(empty, { q: "agua" }), true);
  assert.equal(match(pads, { q: "pd1210" }), true);
  assert.equal(match(pads, { q: "5u0698" }), true);
  assert.equal(match(pads, { q: "vela" }), false);
  assert.equal(match(pads, { category: ["Motor", "Freios"] }), true);
  assert.equal(match(pads, { category: "freios" }), false);
  assert.equal(match(pads, { partBrand: "Fras-le" }), true);
  assert.equal(match(pads, { vehicleBrand: "Chevrolet" }), true);
  assert.equal(match(pads, { vehicleModel: vehicleModelValue("Volkswagen", "Gol") }), true);
  assert.equal(match(pads, { vehicleModel: vehicleModelValue("Fiat", "Gol") }), false);
  assert.equal(match(pads, { color: "Preto" }), true);
  assert.equal(match(pads, { location: "A-2" }), true);
  assert.equal(match(pads, { location: "B-1" }), false);
  assert.equal(match(pads, { position: "D" }), true);
  assert.equal(match(empty, { position: "T" }), true);
  assert.equal(match(empty, { position: "N/A" }), false);
  assert.equal(match(pads, { side: "LE" }), true);
  assert.equal(match(pads, { side: "N/A" }), false);
  assert.equal(match(pads, { status: "low" }), true);
  assert.equal(match(pads, { status: "out" }), false);
  assert.equal(match(empty, { status: "out" }), true);
  assert.equal(match(empty, { status: "low" }), false);
  assert.equal(match(pads, { category: "Freios", partBrand: "Bosch" }), false);
});
