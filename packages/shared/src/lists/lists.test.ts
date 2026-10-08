import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import type { Item } from "../items/items.ts";
import { entryFilters } from "../items/itemFilters.ts";
import {
  createListEntry,
  deleteListEntry,
  EMPTY_ITEM_LISTS,
  findEntry,
  isCatalogBrand,
  ITEM_LIST_TEXTS,
  itemsUsing,
  listEntryCreateSchema,
  listName,
  loadItemLists,
  renameListEntry,
  vehicleModelCreateSchema,
  withEntry,
  withoutEntry,
  type ItemLists,
} from "./lists.ts";
import { itemListsOf } from "./testLists.ts";

const BRAND_ID = "00000000-0000-4000-8000-000000000001";
const LISTS: ItemLists = {
  ...EMPTY_ITEM_LISTS,
  categories: [
    { id: "00000000-0000-4000-8000-0000000000a1", name: "Elétrica" },
    { id: "00000000-0000-4000-8000-0000000000a2", name: "Motor" },
  ],
};

afterEach(() => mock.restoreAll());

/**
 * Answers every fetch with a JSON body, and returns the mock to read what was asked.
 * @param answer The body of each request, by URL.
 * @param status The status of every answer.
 * @returns The fetch mock.
 */
function answer(answer: (url: string) => unknown, status = 200) {
  return mock.method(globalThis, "fetch", async (url: string) => new Response(JSON.stringify(answer(url)), { status }));
}

// Writes new names the way the lists keep them: extra spaces dropped, first letter capital, the rest as typed.
test("Shared: new list names follow the writing rule", () => {
  assert.equal(listName("  motor   diesel "), "Motor diesel");
  assert.equal(listName("l"), "L");
  assert.equal(listName("NGK"), "NGK");
  assert.equal(listName("xR3"), "XR3");
});

// Finds an entry by a typed name whatever its case, accents or spaces, and nothing for a new name or a blank one.
test("Shared: a typed name finds its list entry", () => {
  assert.equal(findEntry(LISTS.categories, " ELETRICA ")?.name, "Elétrica");
  assert.equal(findEntry(LISTS.categories, "Motor diesel"), undefined);
  assert.equal(findEntry(LISTS.categories, " "), undefined);
});

// Adds a created entry in name order, once, and puts a renamed one back in its new place.
test("Shared: a created or renamed entry takes its place in name order", () => {
  const created = { id: "00000000-0000-4000-8000-0000000000a3", name: "Freios" };
  const grown = withEntry(LISTS, "categories", created);
  assert.deepEqual(
    grown.categories.map((entry) => entry.name),
    ["Elétrica", "Freios", "Motor"],
  );
  assert.deepEqual(withEntry(grown, "categories", created), grown);
  const renamed = withEntry(grown, "categories", { ...LISTS.categories[0], name: "Suspensão" });
  assert.deepEqual(
    renamed.categories.map((entry) => entry.name),
    ["Freios", "Motor", "Suspensão"],
  );
});

// Takes a category out of its list, and a vehicle brand together with its models only.
test("Shared: a deleted entry leaves its list, a vehicle brand with its models", () => {
  const lists = itemListsOf([
    { category: "Motor", partBrand: "Bosch", vehicleBrand: "Fiat", vehicleModel: "Uno" },
    { category: "Freios", partBrand: "Bosch", vehicleBrand: "Ford", vehicleModel: "Ka" },
  ] as unknown as Item[]);
  const fiat = findEntry(lists.vehicleBrands, "Fiat")!;
  const withoutFiat = withoutEntry(lists, "vehicleBrands", fiat.id);
  assert.deepEqual(withoutFiat.vehicleBrands.map((entry) => entry.name), ["Ford"]);
  assert.deepEqual(withoutFiat.vehicleModels.map((entry) => entry.name), ["Ka"]);
  assert.deepEqual(withoutEntry(lists, "categories", lists.categories[0].id).categories.map((entry) => entry.name), ["Motor"]);
});

// Counts the items using a category whatever its spelling, and a model only within its own brand.
test("Shared: the items using an entry are counted", () => {
  const items = [
    { category: "Elétrica", partBrand: "Bosch", vehicleBrand: "Fiat", vehicleModel: "Uno" },
    { category: "eletrica", partBrand: "Bosch", vehicleBrand: "Fiat", vehicleModel: null },
    { category: "Motor", partBrand: "Bosch", vehicleBrand: "Ford", vehicleModel: "Uno" },
  ] as unknown as Item[];
  const lists = itemListsOf(items);
  assert.equal(itemsUsing(items, "categories", findEntry(lists.categories, "Elétrica")!, lists), 2);
  assert.equal(itemsUsing(items, "vehicleBrands", findEntry(lists.vehicleBrands, "Fiat")!, lists), 2);
  const fiatUno = lists.vehicleModels.find((model) => model.vehicleBrandId === findEntry(lists.vehicleBrands, "Fiat")!.id)!;
  assert.equal(itemsUsing(items, "vehicleModels", fiatUno, lists), 1);
  assert.equal(itemsUsing(items, "categories", { id: BRAND_ID, name: "Freios" }, lists), 0);
});

// Sets the filters of an entry's items: a category by its name, and a vehicle model with its brand.
test("Shared: an entry leads to the filters of its items", () => {
  const lists = itemListsOf([{ category: "Motor", partBrand: "Bosch", vehicleBrand: "Fiat", vehicleModel: "Uno" }] as unknown as Item[]);
  assert.deepEqual(entryFilters("categories", lists.categories[0], lists).category, ["Motor"]);
  const filters = entryFilters("vehicleModels", lists.vehicleModels[0], lists);
  assert.deepEqual(filters.vehicleModel, ["Fiat|Uno"]);
  assert.deepEqual(filters.category, []);
});

// Tells the catalog's vehicle brands apart from the inventory's own, ignoring case and accents.
test("Shared: the catalog's vehicle brands are known", () => {
  assert.equal(isCatalogBrand("volkswagen"), true);
  assert.equal(isCatalogBrand("Renault"), false);
});

// Words the message of an entry in use for one item and for several.
test("Shared: an entry in use says how many items use it", () => {
  assert.equal(ITEM_LIST_TEXTS.categories.inUse("Motor", 1), "1 item usa “Motor”. Troque a categoria desses itens antes de excluir.");
  assert.match(ITEM_LIST_TEXTS.vehicleModels.inUse("Gol", 3), /^3 itens usam “Gol”/);
});

// Renames an entry and checks the request, then a name another entry has and a failure; deletes one and checks the
// request and a failure.
test("Shared: renaming and deleting reach the entry by its id", async () => {
  const entry = { id: BRAND_ID, name: "Motor diesel" };
  const fetch = answer(() => entry);
  assert.deepEqual(await renameListEntry("/api", "categories", BRAND_ID, "motor diesel"), entry);
  const [url, init] = fetch.mock.calls[0].arguments as unknown as [string, RequestInit];
  assert.equal(url, `/api/categories/${BRAND_ID}`);
  assert.equal(init.method, "PATCH");
  assert.deepEqual(JSON.parse(String(init.body)), { name: "motor diesel" });
  answer(() => ({ message: "taken" }), 409);
  assert.equal(await renameListEntry("/api", "categories", BRAND_ID, "Motor"), "taken");
  answer(() => ({ message: "down" }), 500);
  assert.equal(await renameListEntry("/api", "categories", BRAND_ID, "Motor"), null);

  const removal = mock.method(globalThis, "fetch", async () => new Response(null, { status: 204 }));
  assert.equal(await deleteListEntry("/api", "vehicleBrands", BRAND_ID), true);
  assert.deepEqual(removal.mock.calls[0].arguments, [`/api/vehicle-brands/${BRAND_ID}`, { method: "DELETE" }]);
  answer(() => ({ message: "in use" }), 409);
  assert.equal(await deleteListEntry("/api", "vehicleBrands", BRAND_ID), false);
});

// Checks a new name is required and a new vehicle model needs the id of its vehicle brand.
test("Shared: creating in a list needs a name, and a vehicle model its brand", () => {
  assert.equal(listEntryCreateSchema.safeParse({ name: "  " }).success, false);
  assert.equal(vehicleModelCreateSchema.safeParse({ name: "Gol" }).success, false);
  assert.equal(vehicleModelCreateSchema.safeParse({ name: "Gol", vehicleBrandId: BRAND_ID }).success, true);
});

// Loads the four lists, each from its own path, and checks a failed list fails the whole load.
test("Shared: the four lists load from their paths", async () => {
  const fetch = answer((url) =>
    url.endsWith("/vehicle-models") ? [{ id: BRAND_ID, name: "Gol", vehicleBrandId: BRAND_ID }] : LISTS.categories,
  );
  const lists = await loadItemLists("/api");
  assert.deepEqual(
    fetch.mock.calls.map((call) => call.arguments[0]),
    ["/api/categories", "/api/part-brands", "/api/vehicle-brands", "/api/vehicle-models"],
  );
  assert.deepEqual(lists.partBrands, LISTS.categories);
  assert.equal(lists.vehicleModels[0].vehicleBrandId, BRAND_ID);

  answer(() => ({ message: "down" }), 500);
  await assert.rejects(loadItemLists("/api"));
});

// Creates a vehicle model and checks it is sent with its brand, and that a refused or unreachable request gives
// null.
test("Shared: creating in a list sends the name, and a model its brand", async () => {
  const model = { id: "00000000-0000-4000-8000-0000000000b1", name: "Gol", vehicleBrandId: BRAND_ID };
  const fetch = answer(() => model, 201);
  assert.deepEqual(await createListEntry("/api", "vehicleModels", "Gol", BRAND_ID), model);
  const [url, init] = fetch.mock.calls[0].arguments as unknown as [string, RequestInit];
  assert.equal(url, "/api/vehicle-models");
  assert.equal(init.method, "POST");
  assert.deepEqual(JSON.parse(String(init.body)), { name: "Gol", vehicleBrandId: BRAND_ID });

  answer(() => ({ message: "Required." }), 400);
  assert.equal(await createListEntry("/api", "categories", ""), null);
  mock.method(globalThis, "fetch", async () => Promise.reject(new Error("offline")));
  assert.equal(await createListEntry("/api", "categories", "Freios"), null);
});

// Builds the lists out of some items and checks each name shows once and the models go under their own brand.
test("Shared: the test lists hold what the items use", () => {
  const base = { position: "N/A", side: "N/A", color: "N/A", location: null, quantity: 1, minQuantity: 0 } as const;
  const items = [
    { ...base, category: "Motor", partBrand: "Bosch", vehicleBrand: "Volkswagen", vehicleModel: "Gol" },
    { ...base, category: "motor", partBrand: "NGK", vehicleBrand: "Chevrolet", vehicleModel: "Opala" },
    { ...base, category: "Freios", partBrand: "Bosch", vehicleBrand: "Volkswagen", vehicleModel: null },
  ] as unknown as Item[];
  const lists = itemListsOf(items);
  assert.deepEqual(
    lists.categories.map((entry) => entry.name),
    ["Freios", "Motor"],
  );
  assert.deepEqual(
    lists.partBrands.map((entry) => entry.name),
    ["Bosch", "NGK"],
  );
  const volkswagen = findEntry(lists.vehicleBrands, "Volkswagen")!;
  assert.deepEqual(
    lists.vehicleModels.map((model) => [model.name, model.vehicleBrandId === volkswagen.id]),
    [
      ["Opala", false],
      ["Gol", true],
    ],
  );
});
