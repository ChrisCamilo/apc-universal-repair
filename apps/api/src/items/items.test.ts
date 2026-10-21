import assert from "node:assert/strict";
import { test } from "node:test";
import { itemListQuerySchema } from "@apc/shared/items";
import type { Prisma } from "../generated/prisma/client.js";
import { signedPhotoPath } from "../sessions/sessions.js";
import { TEST_SESSION } from "../sessions/testSessions.js";
import { brandData, createData, itemWhere, toItem, toSortable, updateData } from "./items.js";

// The list entries of an item, as listIds finds them.
const IDS = { categoryId: "motor" };
// An item's one vehicle, as it is sent.
const VEHICLES = [{ vehicleBrand: "volkswagen", vehicleModel: "  " }];
const MIN_QUANTITY = { name: "minQuantity" } as unknown as Prisma.FieldRef<"Item", "Int">;

// Creates an item of two brands from typed values and checks the writing rule, the search key, the category
// referenced (its vehicles are rows of their own), the defaults (N/A position and side, zero minimum) and the quantity as the brands' sum; a position and
// side sent are kept as the database's values.
test("API: new items follow the writing rule and get their defaults", () => {
  const brands = [
    { code: " w 712/95 ", partBrand: "mann", quantity: 3, unitPriceCents: 3990 },
    { code: "ab-1", partBrand: "tecfil", unitPriceCents: 3290 },
  ];
  const data = createData({ name: "filtro de óleo", category: "motor", vehicles: VEHICLES, brands }, IDS);
  assert.equal(data.name, "Filtro de óleo");
  assert.equal(data.nameKey, "filtro de oleo");
  assert.equal(data.categoryId, "motor");
  assert.equal("vehicles" in data, false);
  assert.deepEqual([data.position, data.side], ["NA", "NA"]);
  assert.deepEqual([data.quantity, data.minQuantity], [3, 0]);
  const placed = createData({ name: "B", category: "C", vehicles: VEHICLES, position: "Ambos", side: "LE", brands }, IDS);
  assert.deepEqual([placed.position, placed.side], ["BOTH", "LEFT"]);
});

// Builds a brand's row from typed values and checks the uppercase code with its search key, the part brand
// referenced, its place among the item's brands, the color N/A when empty, a quantity of zero when left out, and empty text saved as null.
test("API: a brand's row follows the writing rule and gets its defaults", () => {
  assert.deepEqual(brandData({ code: " w 712/95 ", partBrand: "mann", color: "", location: "a-2", unitPriceCents: 3990 }, "mann", 0), {
    partBrandId: "mann",
    position: 0,
    code: "W 712/95",
    codeKey: "W71295",
    color: "N/A",
    location: "A-2",
    quantity: 0,
    unitPriceCents: 3990,
  });
  assert.deepEqual(brandData({ code: "x", partBrand: "y", color: "preto", location: " ", quantity: 4, unitPriceCents: 1 }, "y", 2), {
    partBrandId: "y",
    position: 2,
    code: "X",
    codeKey: "X",
    color: "Preto",
    location: null,
    quantity: 4,
    unitPriceCents: 1,
  });
});

// Edits a few fields and checks only those change, with the same rules, the search key kept in step and the list
// entries that changed referenced; the brands and vehicles sent are left to the routes.
test("API: edits apply the rules only to the fields sent", () => {
  assert.deepEqual(updateData({ name: "junta", minQuantity: 3 }, {}), { name: "Junta", nameKey: "junta", minQuantity: 3 });
  assert.deepEqual(updateData({ position: "T", side: "LD" }, {}), { position: "REAR", side: "RIGHT" });
  assert.deepEqual(updateData({ category: "motor" }, IDS), IDS);
  assert.deepEqual(updateData({ vehicles: VEHICLES }, {}), {});
  assert.deepEqual(updateData({ brands: [{ code: "A", partBrand: "B", unitPriceCents: 1 }] }, {}), {});
  assert.deepEqual(updateData({}, {}), {});
});

// Builds the list filter for a search, several filters and a status, and checks the search covers the name, any
// brand's code and any original code, each filter matches any of its values (a list's by its entries' names, a part
// brand, color or location through any brand), Ambos joins a specific position, an unknown side matches nothing, and
// low stock compares the quantity with the item's own minimum.
test("API: list filters match the search, any of the values and the status", () => {
  const query = itemListQuerySchema.parse({
    q: "W712",
    category: ["Freios", "Motor"],
    partBrand: "Mann",
    color: "Preto",
    position: "D",
    side: "X",
    status: "low",
  });
  assert.deepEqual(itemWhere(query, MIN_QUANTITY), {
    AND: [
      {
        OR: [
          { nameKey: { contains: "w712" } },
          { brands: { some: { codeKey: { contains: "W712" } } } },
          { originalCodes: { some: { codeKey: { contains: "W712" } } } },
        ],
      },
      { category: { name: { in: ["Freios", "Motor"] } } },
      { brands: { some: { partBrand: { name: { in: ["Mann"] } } } } },
      { position: { in: ["FRONT", "BOTH"] } },
      { side: { in: [] } },
      { brands: { some: { color: { in: ["Preto"] } } } },
      { quantity: { gt: 0 } },
      { quantity: { lte: MIN_QUANTITY } },
    ],
  });
  assert.deepEqual(itemWhere(itemListQuerySchema.parse({ status: "out" }), MIN_QUANTITY), { AND: [{ quantity: 0 }] });
  assert.deepEqual(itemWhere(itemListQuerySchema.parse({ q: "--" }), MIN_QUANTITY), {
    AND: [{ OR: [{ nameKey: { contains: "--" } }] }],
  });
});

// Filters by a vehicle brand and by two vehicle models of brands that share a model name, and checks each matches an
// item by any of its vehicles, a model with its own brand, leaving out a value without one.
test("API: a vehicle model filter matches the model with its brand", () => {
  const query = itemListQuerySchema.parse({ vehicleBrand: "Fiat", vehicleModel: ["Ford|Gol", "Volkswagen|Gol", "Gol"] });
  assert.deepEqual(itemWhere(query, MIN_QUANTITY), {
    AND: [
      { vehicles: { some: { vehicleBrand: { name: { in: ["Fiat"] } } } } },
      {
        vehicles: {
          some: {
            OR: [
              { vehicleBrand: { name: "Ford" }, vehicleModel: { name: "Gol" } },
              { vehicleBrand: { name: "Volkswagen" }, vehicleModel: { name: "Gol" } },
            ],
          },
        },
      },
    ],
  });
});

// Turns a row into the item the API sends: dates as ISO text, no search keys or references, the names of its list
// entries, its vehicles in order, the position and side as the API speaks them, its original codes in order, and its
// brands in order with their photos at their paths, signed for the caller.
test("API: items carry their entries' names and their brands' photos", () => {
  const date = new Date("2026-10-03T12:00:00.000Z");
  /** A brand's row, with what the item's include reads. */
  const brand = (id: string, code: string, partBrand: string, photos: { id: string; file: string; thumbFile: string }[]) => ({
    id,
    itemId: "i1",
    partBrandId: partBrand.toLowerCase(),
    position: 0,
    partBrand: { name: partBrand },
    code,
    codeKey: code,
    color: "N/A",
    location: "A-2",
    quantity: 2,
    unitPriceCents: 3990,
    photos: photos.map((photo, position) => ({ ...photo, brandId: id, position })),
    createdAt: date,
    updatedAt: date,
  });
  const item = toItem(
    {
      id: "i1",
      name: "Filtro de óleo",
      nameKey: "filtro de oleo",
      ...IDS,
      category: { name: "Motor" },
      vehicles: [
        { vehicleBrand: { name: "Volkswagen" }, vehicleModel: null },
        { vehicleBrand: { name: "Fiat" }, vehicleModel: { name: "Uno" } },
      ],
      position: "FRONT",
      side: "BOTH",
      quantity: 4,
      minQuantity: 2,
      originalCodes: [{ code: "030 115 561 AN" }, { code: "030 115 561 AP" }],
      brands: [brand("b1", "W712", "Mann", [{ id: "p1", file: "p1.jpg", thumbFile: "p1-thumb.webp" }]), brand("b2", "C2433", "Tecfil", [])],
      createdAt: date,
      updatedAt: date,
    },
    TEST_SESSION,
  );
  assert.equal(item.createdAt, "2026-10-03T12:00:00.000Z");
  assert.equal("nameKey" in item || "categoryId" in item, false);
  assert.deepEqual(
    [item.category, item.position, item.side, item.quantity],
    ["Motor", "D", "Ambos", 4],
  );
  assert.deepEqual(item.vehicles, [
    { vehicleBrand: "Volkswagen", vehicleModel: null },
    { vehicleBrand: "Fiat", vehicleModel: "Uno" },
  ]);
  assert.deepEqual(item.originalCodes, ["030 115 561 AN", "030 115 561 AP"]);
  assert.deepEqual(
    item.brands.map((each) => [each.id, each.partBrand, each.code, "codeKey" in each]),
    [
      ["b1", "Mann", "W712", false],
      ["b2", "Tecfil", "C2433", false],
    ],
  );
  assert.deepEqual(item.brands[0].photos, [
    { id: "p1", url: signedPhotoPath(TEST_SESSION, "p1.jpg"), thumbUrl: signedPhotoPath(TEST_SESSION, "p1-thumb.webp") },
  ]);
});

// Turns a row of two brands read for sorting into what sortItems looks at: names, its first vehicle, the position and
// side as the API speaks them, the first brand's code, part brand, color and location, and the lowest price.
test("API: rows read for sorting carry names, the API's values and their first brand", () => {
  const sortable = toSortable({
    id: "i1",
    name: "Junta",
    category: { name: "Motor" },
    vehicles: [{ vehicleBrand: { name: "Volkswagen" }, vehicleModel: { name: "Gol" } }],
    position: "REAR",
    side: "LEFT",
    quantity: 3,
    brands: [
      { code: "A-1", partBrand: { name: "Mann" }, color: "Preto", location: "B-1", unitPriceCents: 900 },
      { code: "B-1", partBrand: { name: "Victor Reinz" }, color: "N/A", location: null, unitPriceCents: 500 },
    ],
  });
  assert.deepEqual(
    [sortable.category, sortable.vehicleBrand, sortable.vehicleModel, sortable.position, sortable.side],
    ["Motor", "Volkswagen", "Gol", "T", "LE"],
  );
  assert.deepEqual(
    [sortable.code, sortable.partBrand, sortable.color, sortable.location, sortable.unitPriceCents, sortable.quantity],
    ["A-1", "Mann", "Preto", "B-1", 500, 3],
  );
});
