import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPTY_ITEM_FILTERS,
  itemFilterOptions,
  itemListQuery,
  POSITION_FILTERS,
  SIDE_FILTERS,
  splitVehicleModel,
  vehicleModelLabel,
  vehicleModelValue,
} from "./itemFilters.ts";
import type { Item } from "./items.ts";

const ITEMS = [
  item({ category: "Motor", partBrand: "Mann", vehicleBrand: "Chevrolet", vehicleModel: "Opala 4.1", color: "Preto", location: "A-2" }),
  item({ category: "Freios", partBrand: "Cobreq", vehicleBrand: "Volkswagen", vehicleModel: "Gol", location: null }),
  item({ category: "motor", partBrand: "Bosch", vehicleBrand: "Fiat", vehicleModel: "Uno", color: "Azul", location: "B-1" }),
  item({ category: "Suspensão", partBrand: "Cofap", vehicleBrand: "Chevrolet", vehicleModel: "Chevette", location: "A-2" }),
  item({ category: "Motor", partBrand: "Mann", vehicleBrand: "Ford", vehicleModel: "Gol", location: "C-1" }),
  item({ category: "Motor", partBrand: "Mann", vehicleBrand: "Ford", vehicleModel: null }),
];

/**
 * Fills in an item with the fields the filters don't look at.
 * @param fields The fields that matter here.
 * @returns A complete item.
 */
function item(fields: Partial<Item>): Item {
  return {
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
  };
}

// Lists the options from the items in stock and checks each list is distinct and sorted, the colors in use come
// after N/A, the locations leave the items without one out, and the vehicle models carry their brand, two brands'
// "Gol" apart, sorted by how they read.
test("Shared: the filters offer what is in stock", () => {
  const options = itemFilterOptions(ITEMS, []);
  assert.deepEqual(options.categories, ["Freios", "Motor", "Suspensão"]);
  assert.deepEqual(options.partBrands, ["Bosch", "Cobreq", "Cofap", "Mann"]);
  assert.deepEqual(options.vehicleBrands, ["Chevrolet", "Fiat", "Ford", "Volkswagen"]);
  assert.deepEqual(options.colors, ["N/A", "Azul", "Preto"]);
  assert.deepEqual(options.locations, ["A-2", "B-1", "C-1"]);
  assert.deepEqual(
    options.vehicleModels.map((model) => model.label),
    ["Chevette · Chevrolet", "Gol · Ford", "Gol · Volkswagen", "Opala 4.1 · Chevrolet", "Uno · Fiat"],
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
// parameter; with nothing chosen, the query is empty.
test("Shared: the list query sends each chosen value", () => {
  const filters = { ...EMPTY_ITEM_FILTERS, category: ["Freios", "Motor"], vehicleModel: ["Chevrolet|Opala 4.1"] };
  assert.equal(itemListQuery(filters, "low"), "category=Freios&category=Motor&vehicleModel=Chevrolet%7COpala+4.1&status=low");
  assert.equal(itemListQuery(EMPTY_ITEM_FILTERS, null), "");
});
