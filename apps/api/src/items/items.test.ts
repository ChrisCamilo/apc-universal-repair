import assert from "node:assert/strict";
import { test } from "node:test";
import { itemListQuerySchema } from "@apc/shared/items";
import type { Item as ItemRow, ItemPhoto as ItemPhotoRow, Prisma } from "../generated/prisma/client.js";
import { createData, itemWhere, toItem, updateData } from "./items.js";

const MIN_QUANTITY = { name: "minQuantity" } as unknown as Prisma.FieldRef<"Item", "Int">;

// Creates an item from typed values and checks the writing rule, the uppercase code, the search keys and
// the defaults: N/A position, side and color, zero quantities, and empty optional text saved as null.
test("API: new items follow the writing rule and get their defaults", () => {
  const data = createData({
    code: " w 712/95 ",
    name: "filtro de óleo",
    category: "motor",
    partBrand: "mann",
    vehicleBrand: "volkswagen",
    vehicleModel: "  ",
    color: "",
    location: "a-2",
    unitPriceCents: 3990,
  });
  assert.equal(data.code, "W 712/95");
  assert.equal(data.codeKey, "W71295");
  assert.equal(data.name, "Filtro de óleo");
  assert.equal(data.nameKey, "filtro de oleo");
  assert.deepEqual([data.category, data.partBrand, data.vehicleBrand, data.location], ["Motor", "Mann", "Volkswagen", "A-2"]);
  assert.equal(data.vehicleModel, null);
  assert.deepEqual([data.position, data.side, data.color], ["N/A", "N/A", "N/A"]);
  assert.deepEqual([data.quantity, data.minQuantity], [0, 0]);
});

// Edits a few fields and checks only those change, with the same rules and the search keys kept in step.
test("API: edits apply the rules only to the fields sent", () => {
  assert.deepEqual(updateData({ name: "junta", quantity: 3 }), { name: "Junta", nameKey: "junta", quantity: 3 });
  assert.deepEqual(updateData({ code: "ab-1" }), { code: "AB-1", codeKey: "AB1" });
  assert.deepEqual(updateData({ color: " ", vehicleModel: "" }), { color: "N/A", vehicleModel: null });
  assert.deepEqual(updateData({}), {});
});

// Builds the list filter for a search, several filters and a status, and checks the search covers name and
// code, each filter matches any of its values, Ambos joins a specific position, and low stock compares the
// quantity with the item's own minimum.
test("API: list filters match the search, any of the values and the status", () => {
  const query = itemListQuerySchema.parse({ q: "W712", category: ["Freios", "Motor"], position: "D", status: "low" });
  assert.deepEqual(itemWhere(query, MIN_QUANTITY), {
    AND: [
      { OR: [{ nameKey: { contains: "w712" } }, { codeKey: { contains: "W712" } }] },
      { category: { in: ["Freios", "Motor"] } },
      { position: { in: ["D", "Ambos"] } },
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
          { vehicleBrand: "Ford", vehicleModel: "Gol" },
          { vehicleBrand: "Volkswagen", vehicleModel: "Gol" },
        ],
      },
    ],
  });
});

// Turns a row into the item the API sends: dates as ISO text, no search keys and the photos at their paths.
test("API: items leave out the search keys and carry their photos", () => {
  const date = new Date("2026-10-03T12:00:00.000Z");
  const row: ItemRow & { photos: ItemPhotoRow[] } = {
    id: "0f0e8a4c-3c4e-4b8e-9a5c-1f2d3e4c5b6a",
    code: "W 712/95",
    codeKey: "W71295",
    name: "Filtro de óleo",
    nameKey: "filtro de oleo",
    category: "Motor",
    partBrand: "Mann",
    vehicleBrand: "Volkswagen",
    vehicleModel: null,
    position: "N/A",
    side: "N/A",
    color: "N/A",
    location: "A-2",
    quantity: 4,
    minQuantity: 2,
    unitPriceCents: 3990,
    photos: [{ id: "p1", itemId: "i1", position: 0, file: "p1.jpg", thumbFile: "p1-thumb.webp" }],
    createdAt: date,
    updatedAt: date,
  };
  const item = toItem(row);
  assert.equal(item.createdAt, "2026-10-03T12:00:00.000Z");
  assert.equal("codeKey" in item || "nameKey" in item, false);
  assert.deepEqual(item.photos, [{ id: "p1", url: "/photos/p1.jpg", thumbUrl: "/photos/p1-thumb.webp" }]);
});
