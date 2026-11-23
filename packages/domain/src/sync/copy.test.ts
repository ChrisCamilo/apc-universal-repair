import assert from "node:assert/strict";
import { test } from "node:test";
import { listItems } from "../inventory/itemFilters.ts";
import { itemListQuerySchema, type Item } from "../inventory/items.ts";
import { testItem } from "../inventory/testItems.ts";
import { itemListsOf } from "../inventory/testLists.ts";
import { applyChanges, copyItems, copyLists, emptyCopy } from "./copy.ts";
import { syncChangesSchema } from "./sync.ts";
import { syncPageOf } from "./testSync.ts";

// A phone's copy of the inventory: pages of the change feed applied to it, and the items and lists it turns into, the
// same as the API answers them.

/** Two items: one with two brands, a photo and a vehicle of a catalog generation and version, one plain. */
const ITEMS: Item[] = [
  testItem({
    id: "00000000-0000-4000-8000-000000000001",
    name: "Pastilha de freio",
    category: "Freios",
    vehicles: [{ vehicleBrand: "Chevrolet", vehicleModel: "Opala", firstYear: 1975, lastYear: 1979, generationNumber: 2, version: "Diplomata" }],
    originalCodes: ["94 650 712"],
    material: "Cerâmica",
    brands: [
      { id: "00000000-0000-4000-8000-0000000000b1", partBrand: "Cobreq", code: "N-123", color: "N/A", location: "A-1", quantity: 2, unitPriceCents: 9990, photos: [{ id: "00000000-0000-4000-8000-0000000000f1", url: "/photos/f1.webp?s", thumbUrl: "/photos/f1-thumb.webp?s" }] },
      { id: "00000000-0000-4000-8000-0000000000b2", partBrand: "Fras-le", code: "PD-55", color: "N/A", location: null, quantity: 1, unitPriceCents: 8990, photos: [] },
    ],
    quantity: 3,
  }),
  testItem({ id: "00000000-0000-4000-8000-000000000002", name: "Filtro de óleo", partBrand: "Mann", code: "W 712" }),
];

/**
 * Fills in the vehicles' fields an item may leave out, as the copy gives them, null when it has none.
 * @param item The item.
 * @returns The same item, every field there.
 */
function complete(item: Item): Item {
  return {
    ...item,
    material: item.material ?? null,
    description: item.description ?? null,
    vehicles: item.vehicles.map((vehicle) => ({
      firstYear: null,
      lastYear: null,
      generationNumber: null,
      version: null,
      ...vehicle,
    })),
  };
}

// Applies a full copy's page to an empty copy and checks it turns back into the same items, with their generation's
// years and number and their brands' photos, and the same lists, as the API answers them.
test("Shared: a full copy turns into the items and lists it was made from", () => {
  const page = syncChangesSchema.parse(syncPageOf(ITEMS));
  const copy = applyChanges(emptyCopy(), page);
  const byId = (items: Item[]) => [...items].sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(byId(copyItems(copy)), byId(ITEMS.map(complete)));
  const lists = itemListsOf(ITEMS);
  assert.deepEqual(
    copyLists(copy).vehicleModels.map((model) => [model.name, model.vehicleBrandId]),
    lists.vehicleModels.map((model) => [model.name, model.vehicleBrandId]),
  );
  assert.deepEqual(copyLists(copy).categories.map((entry) => entry.name), ["Freios", "Motor"]);
  assert.equal(copy.cursor, page.cursor);
});

// Applies a page that renames a category, changes an item and deletes another with its brand, and checks the items
// show the new name and the change, and the deleted one is gone.
test("Shared: a page of changes renames, changes and deletes in the copy", () => {
  const copy = applyChanges(emptyCopy(), syncPageOf(ITEMS));
  const category = Object.values(copy.rows.category).find((entry) => entry.name === "Freios")!;
  const item = copy.rows.item[ITEMS[0].id];
  applyChanges(copy, {
    changes: [
      { kind: "category", id: category.id, version: 100, row: { ...category, name: "Freios e embreagem" } },
      { kind: "item", id: item.id, version: 101, row: { ...item, name: "Pastilha dianteira" } },
      { kind: "itemBrand", id: ITEMS[1].brands[0].id, version: 102, row: null },
      { kind: "item", id: ITEMS[1].id, version: 103, row: null },
    ],
    cursor: "test-database.103",
    more: false,
  });
  assert.deepEqual(
    copyItems(copy).map((each) => [each.name, each.category]),
    [["Pastilha dianteira", "Freios e embreagem"]],
  );
  assert.equal(copy.cursor, "test-database.103");
});

// Leaves out the brands of a copy caught halfway and checks their item isn't shown, as an item always has a brand.
test("Shared: an item whose rows haven't all arrived is left out", () => {
  const page = syncPageOf(ITEMS);
  const copy = applyChanges(emptyCopy(), { ...page, changes: page.changes.filter((change) => change.kind !== "itemBrand" || change.id !== ITEMS[1].brands[0].id) });
  assert.deepEqual(copyItems(copy).map((item) => item.id), [ITEMS[0].id]);
});

// Answers list queries from the items held and checks the search, a filter, sorting and pages match the API's rules.
test("Shared: a list query is answered from the items held, as GET /items answers it", () => {
  const items = copyItems(applyChanges(emptyCopy(), syncPageOf(ITEMS)));
  const query = (params: Record<string, string>) => itemListQuerySchema.parse(params);
  assert.deepEqual(listItems(items, query({ q: "w712" })).items.map((item) => item.name), ["Filtro de óleo"]);
  assert.deepEqual(listItems(items, query({ category: "Freios" })).items.map((item) => item.name), ["Pastilha de freio"]);
  assert.deepEqual(listItems(items, query({ sort: "name", order: "asc" })).items.map((item) => item.name), ["Filtro de óleo", "Pastilha de freio"]);
  assert.deepEqual(listItems(items, query({ sort: "name", order: "asc", page: "2", pageSize: "25" })), { items: [], total: 2 });
});
