import assert from "node:assert/strict";
import { test } from "node:test";
import { itemFormBody, itemFormOf } from "../inventory/itemForm.ts";
import type { Item } from "../inventory/items.ts";
import { testItem } from "../inventory/testItems.ts";
import { applyChanges, copyItems, copyLists, emptyCopy, type SyncCopy } from "./copy.ts";
import { conflictNotice, conflictsNotice, itemOperations, refusedNotice, sentOperation, waitingNotice, withQueue, type QueuedOperation } from "./queue.ts";
import { syncPageOf } from "./testSync.ts";

// The changes a phone keeps to send, applied over its copy of the server's rows as the server would apply them: a new
// item with the names and Catalog entries it brings, an edit sending its stock as moves, a move stopping at 0, a delete,
// a brand's photos, a name added to a list; and what the phone says when the server refuses one.

/** An item with a brand that has a photo, of a vehicle the Catalog doesn't have. */
const HELD = testItem({
  id: "00000000-0000-4000-8000-000000000001",
  name: "Pastilha de freio",
  category: "Freios",
  brands: [
    {
      id: "00000000-0000-4000-8000-0000000000b1",
      partBrand: "Cobreq",
      code: "N-123",
      color: "N/A",
      location: "A-1",
      quantity: 4,
      unitPriceCents: 9990,
      photos: [{ id: "00000000-0000-4000-8000-0000000000f1", url: "/photos/f1.webp", thumbUrl: "/photos/f1-thumb.webp" }],
    },
  ],
  quantity: 4,
});
/** When the operations of the tests were made. */
const AT = "2026-11-23T12:00:00.000Z";

/**
 * Makes a copy of some items, as a full copy brings them.
 * @param items The items.
 * @returns The copy.
 */
function copyOf(items: Item[]): SyncCopy {
  return applyChanges(emptyCopy(), syncPageOf(items));
}

/**
 * Gives ids one after the other, as the phone gives a new item, brand and operation theirs.
 * @returns What gives the next id.
 */
function ids(): () => string {
  let count = 0;
  return () => `10000000-0000-4000-8000-${String(++count).padStart(12, "0")}`;
}

// Queues a new item of names, a vehicle model and a generation the copy doesn't hold, and checks the copy with the queue
// shows it with the ids the phone gave it, its names as the lists write them, added to the lists, and its generation
// added to the Catalog, while the copy itself is left as it was.
test("Shared: a new item in the queue shows over the copy with the names and generation it brings", () => {
  const copy = copyOf([HELD]);
  const body = {
    name: "bomba d'água",
    category: "arrefecimento",
    vehicles: [{ vehicleBrand: "gurgel", vehicleModel: "x12", firstYear: 1975, lastYear: 1988, version: "tr" }],
    brands: [{ partBrand: "urba", code: "ub-12 ", quantity: 3, unitPriceCents: 15990, color: "preto" }],
  };
  const { operations, itemId, brandIds } = itemOperations(body, undefined, { newId: ids(), at: AT });
  const shown = withQueue(copy, operations);
  const item = copyItems(shown).find((each) => each.id === itemId)!;
  assert.deepEqual(
    [item.name, item.category, item.quantity, item.brands[0].id, item.brands[0].code, item.brands[0].color, item.brands[0].partBrand],
    ["Bomba d'água", "Arrefecimento", 3, brandIds[0], "UB-12", "PRETO", "Urba"],
  );
  assert.deepEqual(item.vehicles, [{ vehicleBrand: "Gurgel", vehicleModel: "X12", firstYear: 1975, lastYear: 1988, generationNumber: 1, version: "Tr" }]);
  assert.equal(item.createdAt, AT);
  const lists = copyLists(shown);
  assert.ok(lists.categories.some((entry) => entry.name === "Arrefecimento"));
  assert.ok(lists.vehicleModels.some((model) => model.name === "X12" && model.inCatalog));
  assert.equal(copyItems(copy).length, 1);
  assert.equal(Object.keys(copy.rows.category).length, 1);
  assert.deepEqual(withQueue(copy, operations), shown);
});

// Edits an item as the form saves it, its brand's quantity from 4 to 6 and a new brand added, and checks the edit sends
// the kept brand without its quantity, the change as a move of +2 after it, and the new brand with the id the phone gave
// it; and that the copy with them shows the item with both brands and their quantities added up.
test("Shared: an edit sends its stock change as a move, and shows over the copy", () => {
  const copy = copyOf([HELD]);
  const form = itemFormOf(HELD);
  form.name = "Pastilha dianteira";
  form.brands = [
    { ...form.brands[0], quantity: "6" },
    { ...form.brands[0], id: undefined, partBrand: "Fras-le", code: "PD-55", quantity: "2" },
  ];
  const { operations, brandIds } = itemOperations(itemFormBody(form, []), HELD, { newId: ids(), at: AT });
  assert.deepEqual(
    operations.map((operation) => operation.type),
    ["updateItem", "moveStock"],
  );
  const [edit, move] = operations;
  assert.ok(edit.type === "updateItem" && edit.changes.brands);
  assert.equal(edit.changes.brands[0].quantity, undefined);
  assert.deepEqual([edit.changes.brands[1].id, edit.changes.brands[1].quantity], [brandIds[1], 2]);
  assert.ok(move.type === "moveStock");
  assert.deepEqual([move.brandId, move.delta], [HELD.brands[0].id, 2]);

  const [item] = copyItems(withQueue(copy, operations));
  assert.deepEqual(
    [item.name, item.quantity, item.brands.map((brand) => [brand.code, brand.quantity])],
    [
      "Pastilha dianteira",
      8,
      [
        ["N-123", 6],
        ["PD-55", 2],
      ],
    ],
  );
  assert.equal(item.brands[0].photos.length, 1);
});

// Takes out more than a brand has, deletes another item, and moves the stock of an item that isn't there, and checks the
// stock stops at 0, the deleted item is gone with its photos, and the move on no item changes nothing.
test("Shared: a move stops at 0, a delete takes the photos, and an operation on no item changes nothing", () => {
  const other = testItem({ id: "00000000-0000-4000-8000-000000000002", code: "W 712" });
  const copy = copyOf([HELD, other]);
  const made = { at: AT, label: "Pastilha de freio" };
  const queue: QueuedOperation[] = [
    { id: "20000000-0000-4000-8000-000000000001", type: "moveStock", itemId: HELD.id, brandId: HELD.brands[0].id, delta: -10, ...made },
    { id: "20000000-0000-4000-8000-000000000002", type: "deleteItem", itemId: other.id, ...made },
    { id: "20000000-0000-4000-8000-000000000003", type: "moveStock", itemId: other.id, brandId: other.brands[0].id, delta: 1, ...made },
  ];
  const shown = withQueue(copy, queue);
  assert.deepEqual(
    copyItems(shown).map((item) => [item.id, item.quantity]),
    [[HELD.id, 0]],
  );
  assert.equal(Object.keys(shown.rows.itemBrand).length, 1);
});

// Sets a brand's photos to its saved one, a copy of another item's photo and a new file, in that order, and checks they
// show in it with the copy's and the file's ids, the file from where the phone keeps it.
test("Shared: a brand's photos in the queue show over the copy", () => {
  const other = testItem({
    id: "00000000-0000-4000-8000-000000000002",
    code: "W 712",
    photos: [{ id: "00000000-0000-4000-8000-0000000000f2", url: "/photos/f2.webp", thumbUrl: "/photos/f2-thumb.webp" }],
  });
  const copy = copyOf([HELD, other]);
  const photos: QueuedOperation = {
    id: "20000000-0000-4000-8000-000000000001",
    type: "savePhotos",
    itemId: HELD.id,
    brandId: HELD.brands[0].id,
    photos: [
      { file: { url: "file:///held/p3", name: "p3.jpg", type: "image/jpeg" }, id: "30000000-0000-4000-8000-000000000003" },
      { keep: HELD.brands[0].photos[0].id },
      { copy: other.brands[0].photos[0].id, id: "30000000-0000-4000-8000-000000000002" },
    ],
    at: AT,
    label: HELD.name,
  };
  const item = copyItems(withQueue(copy, [photos])).find((each) => each.id === HELD.id)!;
  assert.deepEqual(item.brands[0].photos, [
    { id: "30000000-0000-4000-8000-000000000003", url: "file:///held/p3", thumbUrl: "file:///held/p3" },
    HELD.brands[0].photos[0],
    { id: "30000000-0000-4000-8000-000000000002", url: "/photos/f2.webp", thumbUrl: "/photos/f2-thumb.webp" },
  ]);
});

// Adds a vehicle model under a vehicle brand the copy doesn't hold, and a category it holds written another way, and
// checks the lists show the brand and its model, and the category once.
test("Shared: a name in the queue joins its list, a model under its brand", () => {
  const copy = copyOf([HELD]);
  const made = { at: AT };
  const lists = copyLists(
    withQueue(copy, [
      { id: "20000000-0000-4000-8000-000000000001", type: "addName", kind: "vehicleModels", name: "fusca", vehicleBrand: "Volks", label: "fusca", ...made },
      { id: "20000000-0000-4000-8000-000000000002", type: "addName", kind: "categories", name: "freios", label: "freios", ...made },
    ]),
  );
  const brand = lists.vehicleBrands.find((entry) => entry.name === "Volks")!;
  assert.ok(lists.vehicleModels.some((model) => model.name === "Fusca" && model.vehicleBrandId === brand.id));
  assert.deepEqual(
    lists.categories.map((entry) => entry.name),
    ["Freios"],
  );
});

// Turns a queued operation into what the server is sent, and checks only the operation's own fields go; then says the
// server refused a new item over a code and a move on an item gone, and how many changes wait.
test("Shared: an operation is sent without the queue's fields, and a refusal says why", () => {
  const move: QueuedOperation = {
    id: "20000000-0000-4000-8000-000000000001",
    type: "moveStock",
    itemId: HELD.id,
    brandId: HELD.brands[0].id,
    delta: 1,
    at: AT,
    label: HELD.name,
    sent: true,
  };
  assert.deepEqual(sentOperation(move), { id: move.id, type: "moveStock", itemId: HELD.id, brandId: HELD.brands[0].id, delta: 1 });
  assert.equal(
    refusedNotice(move, { statusCode: 404 }, "pt-BR"),
    "O servidor recusou a mudança de estoque de “Pastilha de freio”: o item não existe mais no servidor.",
  );
  const { operations } = itemOperations(itemFormBody(itemFormOf(HELD), []), undefined, { newId: ids(), at: AT });
  assert.equal(
    refusedNotice(operations[0], { statusCode: 409, details: [{ code: "N-123", itemName: "Pastilha traseira" }] }, "pt-BR"),
    "O servidor recusou o cadastro de “Pastilha de freio”: o código N-123 já é usado por “Pastilha traseira”.",
  );
  assert.deepEqual([waitingNotice(1, "pt-BR"), waitingNotice(3, "pt-BR")], ["1 alteração esperando o servidor.", "3 alterações esperando o servidor."]);

  // The same notices in English, each operation in English's own sentence.
  assert.equal(refusedNotice(move, { statusCode: 404 }, "en-US"), "The server refused the stock move of “Pastilha de freio”: the item no longer exists on the server.");
  assert.equal(
    refusedNotice(operations[0], { statusCode: 409, details: [{ code: "N-123", itemName: "Pastilha traseira" }] }, "en-US"),
    "The server refused the creation of “Pastilha de freio”: code N-123 is already used by “Pastilha traseira”.",
  );
  assert.equal(
    conflictNotice(move, "en-US"),
    "The stock move of “Pastilha de freio” conflicts with what changed on the computer. Choose what to keep in the Inventory.",
  );
  assert.deepEqual([waitingNotice(1, "en-US"), waitingNotice(3, "en-US")], ["1 change waiting for the server.", "3 changes waiting for the server."]);
  assert.deepEqual([conflictsNotice(1, "en-US"), conflictsNotice(2, "en-US")], ["1 conflict with the computer to settle.", "2 conflicts with the computer to settle."]);
});
