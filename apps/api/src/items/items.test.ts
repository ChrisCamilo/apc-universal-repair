import assert from "node:assert/strict";
import { test } from "node:test";
import { itemListQuerySchema } from "@apc/shared/items";
import type { Prisma } from "../generated/prisma/client.js";
import { createData, itemWhere, toItem, toSortable, updateData } from "./items.js";

// The list entries of an item, as listIds finds them.
const IDS = { categoryId: "motor", partBrandId: "mann", vehicleBrandId: "vw", vehicleModelId: null };
const MIN_QUANTITY = { name: "minQuantity" } as unknown as Prisma.FieldRef<"Item", "Int">;

// Creates an item from typed values and checks the writing rule, the uppercase code, the search keys, the list
// entries referenced and the defaults: N/A position, side and color, zero quantities, and empty optional text saved
// as null; a position and side sent are kept as the database's values.
test("API: new items follow the writing rule and get their defaults", () => {
  const data = createData(
    {
      code: " w 712/95 ",
      name: "filtro de óleo",
      category: "motor",
      partBrand: "mann",
      vehicleBrand: "volkswagen",
      vehicleModel: "  ",
      color: "",
      location: "a-2",
      unitPriceCents: 3990,
    },
    IDS,
  );
  assert.equal(data.code, "W 712/95");
  assert.equal(data.codeKey, "W71295");
  assert.equal(data.name, "Filtro de óleo");
  assert.equal(data.nameKey, "filtro de oleo");
  assert.deepEqual([data.categoryId, data.partBrandId, data.vehicleBrandId, data.vehicleModelId], ["motor", "mann", "vw", null]);
  assert.equal(data.location, "A-2");
  assert.deepEqual([data.position, data.side, data.color], ["NA", "NA", "N/A"]);
  assert.deepEqual([data.quantity, data.minQuantity], [0, 0]);
  const placed = createData(
    { code: "A", name: "B", category: "C", partBrand: "D", vehicleBrand: "E", position: "Ambos", side: "LE", unitPriceCents: 1 },
    IDS,
  );
  assert.deepEqual([placed.position, placed.side], ["BOTH", "LEFT"]);
});

// Edits a few fields and checks only those change, with the same rules, the search keys kept in step and the list
// entries that changed referenced.
test("API: edits apply the rules only to the fields sent", () => {
  assert.deepEqual(updateData({ name: "junta", quantity: 3 }, {}), { name: "Junta", nameKey: "junta", quantity: 3 });
  assert.deepEqual(updateData({ code: "ab-1" }, {}), { code: "AB-1", codeKey: "AB1" });
  assert.deepEqual(updateData({ color: " ", position: "T", side: "LD" }, {}), { color: "N/A", position: "REAR", side: "RIGHT" });
  assert.deepEqual(updateData({ vehicleModel: "" }, { vehicleModelId: null }), { vehicleModelId: null });
  assert.deepEqual(updateData({}, {}), {});
});

// Builds the list filter for a search, several filters and a status, and checks the search covers name and code, each
// filter matches any of its values (a list's by its entries' names), Ambos joins a specific position, an unknown side
// matches nothing, and low stock compares the quantity with the item's own minimum.
test("API: list filters match the search, any of the values and the status", () => {
  const query = itemListQuerySchema.parse({ q: "W712", category: ["Freios", "Motor"], position: "D", side: "X", status: "low" });
  assert.deepEqual(itemWhere(query, MIN_QUANTITY), {
    AND: [
      { OR: [{ nameKey: { contains: "w712" } }, { codeKey: { contains: "W712" } }] },
      { category: { name: { in: ["Freios", "Motor"] } } },
      { position: { in: ["FRONT", "BOTH"] } },
      { side: { in: [] } },
      { quantity: { gt: 0 } },
      { quantity: { lte: MIN_QUANTITY } },
    ],
  });
  assert.deepEqual(itemWhere(itemListQuerySchema.parse({ status: "out" }), MIN_QUANTITY), { AND: [{ quantity: 0 }] });
  assert.deepEqual(itemWhere(itemListQuerySchema.parse({ q: "--" }), MIN_QUANTITY), {
    AND: [{ OR: [{ nameKey: { contains: "--" } }] }],
  });
});

// Filters by two vehicle models of brands that share a model name, and checks each matches with its own brand,
// leaving out a value without one.
test("API: a vehicle model filter matches the model with its brand", () => {
  const query = itemListQuerySchema.parse({ vehicleModel: ["Ford|Gol", "Volkswagen|Gol", "Gol"] });
  assert.deepEqual(itemWhere(query, MIN_QUANTITY), {
    AND: [
      {
        OR: [
          { vehicleBrand: { name: "Ford" }, vehicleModel: { name: "Gol" } },
          { vehicleBrand: { name: "Volkswagen" }, vehicleModel: { name: "Gol" } },
        ],
      },
    ],
  });
});

// Turns a row into the item the API sends: dates as ISO text, no search keys or references, the names of its list
// entries, the position and side as the API speaks them, and the photos at their paths.
test("API: items carry their entries' names and their photos", () => {
  const date = new Date("2026-10-03T12:00:00.000Z");
  const item = toItem({
    id: "0f0e8a4c-3c4e-4b8e-9a5c-1f2d3e4c5b6a",
    code: "W 712/95",
    codeKey: "W71295",
    name: "Filtro de óleo",
    nameKey: "filtro de oleo",
    ...IDS,
    category: { name: "Motor" },
    partBrand: { name: "Mann" },
    vehicleBrand: { name: "Volkswagen" },
    vehicleModel: null,
    position: "FRONT",
    side: "BOTH",
    color: "N/A",
    location: "A-2",
    quantity: 4,
    minQuantity: 2,
    unitPriceCents: 3990,
    photos: [{ id: "p1", itemId: "i1", position: 0, file: "p1.jpg", thumbFile: "p1-thumb.webp" }],
    createdAt: date,
    updatedAt: date,
  });
  assert.equal(item.createdAt, "2026-10-03T12:00:00.000Z");
  assert.equal("codeKey" in item || "nameKey" in item || "categoryId" in item, false);
  assert.deepEqual(
    [item.category, item.partBrand, item.vehicleBrand, item.vehicleModel, item.position, item.side],
    ["Motor", "Mann", "Volkswagen", null, "D", "Ambos"],
  );
  assert.deepEqual(item.photos, [{ id: "p1", url: "/photos/p1.jpg", thumbUrl: "/photos/p1-thumb.webp" }]);
});

// Turns a row read for sorting into what sortItems looks at: names, and the position and side as the API speaks them.
test("API: rows read for sorting carry names and the API's values", () => {
  const sortable = toSortable({
    id: "i1",
    code: "A-1",
    name: "Junta",
    category: { name: "Motor" },
    partBrand: { name: "Mann" },
    vehicleBrand: { name: "Volkswagen" },
    vehicleModel: { name: "Gol" },
    position: "REAR",
    side: "LEFT",
    color: "N/A",
    location: null,
    unitPriceCents: 100,
    quantity: 1,
  });
  assert.deepEqual([sortable.category, sortable.vehicleModel, sortable.position, sortable.side], ["Motor", "Gol", "T", "LE"]);
});
