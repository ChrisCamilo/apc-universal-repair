import assert from "node:assert/strict";
import { test } from "node:test";
import { itemFormBody, itemFormOf } from "../inventory/itemForm.ts";
import { formatPrice, type Item, type ItemUpdate } from "../inventory/items.ts";
import { testItem } from "../inventory/testItems.ts";
import { applyChanges, copyItems, emptyCopy } from "./copy.ts";
import { conflictCards, deleteConflicts, editOf, mergeEdit, seenOf, settleConflict } from "./conflicts.ts";
import { itemOperations, withQueue, type QueuedItemOperation, type QueuedOperation } from "./queue.ts";
import { syncPageOf } from "./testSync.ts";

// The changes made on both sides to the same item: what the phone sends of an edit and a delete, how the server merges
// them with the item as it is now, field by field and brand by brand, which ones conflict, and how the phone lists and
// settles each conflict.

const BRAND_A = "00000000-0000-4000-8000-0000000000a1";
const BRAND_B = "00000000-0000-4000-8000-0000000000b1";
const BRAND_C = "00000000-0000-4000-8000-0000000000c1";
/** An item with two brands, as the phone saw it. */
const SAW = testItem({
  id: "00000000-0000-4000-8000-000000000001",
  name: "Farol",
  category: "Iluminação",
  vehicles: [{ vehicleBrand: "Volkswagen", vehicleModel: "Gol", firstYear: 1995, lastYear: 2005, generationNumber: 2, version: null }],
  originalCodes: ["377 941 015"],
  minQuantity: 1,
  brands: [
    { id: BRAND_A, partBrand: "Arteb", code: "AR-1", color: "N/A", location: "A-1", quantity: 3, unitPriceCents: 19990, photos: [] },
    { id: BRAND_B, partBrand: "Cibié", code: "CB-1", color: "N/A", location: null, quantity: 2, unitPriceCents: 24990, photos: [] },
  ],
  quantity: 5,
});
const AT = "2026-11-24T12:00:00.000Z";

/**
 * Gives ids one after the other, as the phone gives its operations theirs.
 * @returns What gives the next id.
 */
function ids(): () => string {
  let count = 0;
  return () => `10000000-0000-4000-8000-${String(++count).padStart(12, "0")}`;
}

/**
 * Makes the item as the server holds it, from what the phone saw with some changes.
 * @param changes The fields the computer changed.
 * @returns The item.
 */
function onServer(changes: Partial<Item> = {}): Item {
  return { ...SAW, ...changes };
}

/**
 * Saves the item form of what the phone saw with some changes, as the Inventory does.
 * @param change Changes the form.
 * @returns The edit queued.
 */
function editing(change: (form: ReturnType<typeof itemFormOf>) => void): Extract<QueuedItemOperation, { type: "updateItem" }> {
  const form = itemFormOf(SAW);
  change(form);
  const [edit] = itemOperations(itemFormBody(form, []), SAW, { newId: ids(), at: AT }).operations;
  assert.ok(edit.type === "updateItem");
  return edit;
}

// Saves an edit of the name and the minimum, and one of a brand's quantity alone, and checks the first sends only the
// fields it changes, with what the phone saw of each, and the second sends only the move.
test("Shared: an edit sends only the fields it changes, with what the phone saw of them", () => {
  const edit = editing((form) => {
    form.name = "Farol esquerdo";
    form.minQuantity = "2";
  });
  assert.ok(edit.type === "updateItem");
  assert.deepEqual(edit.changes, { name: "Farol esquerdo", minQuantity: 2 });
  assert.deepEqual(edit.seen, { name: "Farol", minQuantity: 1 });

  const form = itemFormOf(SAW);
  form.brands[0].quantity = "5";
  const { operations } = itemOperations(itemFormBody(form, []), SAW, { newId: ids(), at: AT });
  assert.deepEqual(
    operations.map((operation) => operation.type),
    ["moveStock"],
  );
});

// Merges an edit of the name with the server's item: changed only on the phone, it applies; changed on the computer to
// the same name, written another way, it applies; changed there to another name, it conflicts with the computer's; and
// a field the phone sent as it saw it keeps the computer's value.
test("Shared: a field changed on both sides to different values conflicts, and one changed on one side applies", () => {
  const changes: ItemUpdate = { name: "Farol esquerdo" };
  const seen = { name: "Farol" };
  assert.deepEqual(mergeEdit(onServer(), changes, seen), { conflicts: [], changes });
  assert.deepEqual(mergeEdit(onServer({ name: "farol esquerdo" }), changes, seen).conflicts, []);
  assert.deepEqual(mergeEdit(onServer({ name: "Farol direito" }), changes, seen), {
    conflicts: [{ kind: "field", field: "name", theirs: "Farol direito" }],
    changes: {},
  });
  assert.deepEqual(mergeEdit(onServer({ material: "Vidro" }), { material: "" }, { material: null }).changes, {});
  assert.deepEqual(mergeEdit(onServer({ name: "Farol direito" }), changes, undefined).changes, changes, "without what the phone saw, as sent");
});

// Changes the vehicles on both sides, and the original codes on the computer while the phone changes the name, and
// checks the vehicles conflict as one field and the original codes, left alone by the phone, don't.
test("Shared: an item's vehicles and its original codes are each one field", () => {
  const vehicles = [{ vehicleBrand: "Fiat", vehicleModel: "Uno" }];
  const theirs = [{ vehicleBrand: "Ford", vehicleModel: "Ka", firstYear: null, lastYear: null, generationNumber: null, version: null }];
  assert.deepEqual(mergeEdit(onServer({ vehicles: theirs }), { vehicles }, { vehicles: SAW.vehicles }).conflicts, [
    { kind: "field", field: "vehicles", theirs },
  ]);
  assert.deepEqual(mergeEdit(onServer({ originalCodes: ["5U0 941 015"] }), { name: "Farol LE" }, { name: "Farol" }), {
    conflicts: [],
    changes: { name: "Farol LE" },
  });
});

// Changes brand A's price on the phone and its location on the computer, brand B's price on both sides, removes a brand
// on the phone that the computer changed, and changes one the computer deleted, and checks each brand field merges on
// its own, a brand added on the computer is kept, and the others conflict brand by brand.
test("Shared: brands conflict brand by brand, field by field, and one added on the computer is kept", () => {
  const edit = editing((form) => {
    form.brands[0].price = "R$ 209,90";
  });
  assert.ok(edit.type === "updateItem" && edit.seen?.brands);
  const added = { id: BRAND_C, partBrand: "Fitam", code: "FT-1", color: "N/A", location: null, quantity: 1, unitPriceCents: 9990, photos: [] };
  const server = onServer({ brands: [{ ...SAW.brands[0], location: "B-2" }, SAW.brands[1], added] });
  const merged = mergeEdit(server, edit.changes, edit.seen);
  assert.deepEqual(merged.conflicts, []);
  assert.deepEqual(
    merged.changes.brands?.map((brand) => [brand.id, brand.location, brand.unitPriceCents, brand.quantity]),
    [
      [BRAND_A, "B-2", 20990, undefined],
      [BRAND_B, "", 24990, undefined],
      [BRAND_C, "", 9990, undefined],
    ],
  );

  const bothPrices = mergeEdit(onServer({ brands: [{ ...SAW.brands[0], unitPriceCents: 21990 }, SAW.brands[1]] }), edit.changes, edit.seen);
  assert.deepEqual(bothPrices.conflicts, [{ kind: "brandField", brandId: BRAND_A, field: "unitPriceCents", theirs: 21990 }]);

  const removing = editing((form) => {
    form.brands = [form.brands[0]];
  });
  const changedThere = onServer({ brands: [SAW.brands[0], { ...SAW.brands[1], color: "PRETO" }] });
  assert.deepEqual(mergeEdit(changedThere, removing.changes, removing.seen).conflicts, [{ kind: "brandChanged", brandId: BRAND_B }]);
  assert.deepEqual(
    mergeEdit(onServer({ brands: [SAW.brands[0], { ...SAW.brands[1], quantity: 9 }] }), removing.changes, removing.seen).changes.brands?.map((brand) => brand.id),
    [BRAND_A],
    "a quantity moved on the computer doesn't stop the removal",
  );

  const deletedThere = onServer({ brands: [SAW.brands[1]] });
  assert.deepEqual(mergeEdit(deletedThere, edit.changes, edit.seen).conflicts, [{ kind: "brandDeleted", brandId: BRAND_A }]);
  const untouched = editing((form) => {
    form.brands[1].location = "C-3";
  });
  assert.deepEqual(
    mergeEdit(deletedThere, untouched.changes, untouched.seen).changes.brands?.map((brand) => [brand.id, brand.location]),
    [[BRAND_B, "C-3"]],
    "a brand the phone left alone stays deleted",
  );
});

// Deletes the item on the phone, and checks the delete conflicts with an item renamed or given a brand on the computer,
// and not with one whose stock alone moved.
test("Shared: a delete of an item changed on the computer conflicts, quantities aside", () => {
  const seen = seenOf(SAW);
  assert.deepEqual(deleteConflicts(onServer({ quantity: 9, brands: [{ ...SAW.brands[0], quantity: 7 }, SAW.brands[1]] }), seen), []);
  assert.deepEqual(deleteConflicts(onServer({ name: "Farol LE" }), seen), [{ kind: "itemChanged" }]);
  const added = { id: BRAND_C, partBrand: "Fitam", code: "FT-1", color: "N/A", location: null, quantity: 1, unitPriceCents: 9990, photos: [] };
  assert.deepEqual(deleteConflicts(onServer({ brands: [...SAW.brands, added] }), seen), [{ kind: "itemChanged" }]);
  assert.deepEqual(deleteConflicts(onServer({ name: "Farol LE" }), undefined), []);
});

// Settles a name conflict keeping each side, and a brand price conflict keeping the computer's, and checks the edit
// drops the field or sends it without what the phone saw, the price sent is the computer's, and the card says both.
test("Shared: a field's conflict is settled keeping the computer's value or the phone's", () => {
  const edit = editing((form) => {
    form.name = "Farol esquerdo";
    form.brands[0].price = "R$ 209,90";
  });
  const conflicted: QueuedOperation = {
    ...edit,
    conflicts: [
      { kind: "field", field: "name", theirs: "Farol direito" },
      { kind: "brandField", brandId: BRAND_A, field: "unitPriceCents", theirs: 21990 },
    ],
    snapshot: SAW,
  };
  const cards = conflictCards([conflicted]);
  assert.deepEqual(
    cards.map((card) => [card.title, card.theirs, card.mine]),
    [
      ["“Farol esquerdo” · Nome", "Farol direito", "Farol esquerdo"],
      ["“Farol esquerdo” · Arteb (AR-1) · Preço", formatPrice(21990), formatPrice(20990)],
    ],
  );

  const [mine] = settleConflict([conflicted], cards[0], "mine");
  assert.ok(mine.type === "updateItem");
  assert.equal(mine.changes.name, "Farol esquerdo");
  assert.equal(mine.seen?.name, undefined);
  assert.equal(mine.conflicts?.length, 1);
  const [theirs] = settleConflict([conflicted], cards[0], "theirs");
  assert.ok(theirs.type === "updateItem");
  assert.equal(theirs.changes.name, undefined);

  const [settled] = settleConflict([mine], { operationId: mine.id, index: 0 }, "theirs");
  assert.ok(settled.type === "updateItem");
  assert.equal(settled.conflicts, undefined, "once settled, it goes out again");
  assert.equal(settled.snapshot, undefined);
  const server = onServer({ name: "Farol direito", brands: [{ ...SAW.brands[0], unitPriceCents: 21990 }, SAW.brands[1]] });
  const merged = mergeEdit(server, settled.changes, settled.seen);
  assert.deepEqual(merged.conflicts, []);
  assert.deepEqual([merged.changes.name, merged.changes.brands?.[0].unitPriceCents], ["Farol esquerdo", 21990]);
});

// Settles an item deleted on the computer, with an edit and a move of it waiting, keeping it deleted, then making it
// again, and checks the first drops every change to it, and the second sends it as a new item, as the phone showed it.
test("Shared: an item deleted on the computer stays deleted, or is made again as the phone shows it", () => {
  const edit = editing((form) => {
    form.name = "Farol esquerdo";
  });
  const move: QueuedOperation = { id: "10000000-0000-4000-8000-000000000099", type: "moveStock", itemId: SAW.id, brandId: BRAND_A, delta: -1, at: AT, label: "Farol" };
  const other: QueuedOperation = { id: "10000000-0000-4000-8000-000000000098", type: "addName", kind: "categories", name: "Faróis", at: AT, label: "Faróis" };
  const snapshot = { ...SAW, name: "Farol esquerdo", brands: [{ ...SAW.brands[0], quantity: 2 }, SAW.brands[1]] };
  const queue: QueuedOperation[] = [
    { ...edit, conflicts: [{ kind: "itemDeleted" }], snapshot },
    other,
    { ...move, conflicts: [{ kind: "itemDeleted" }], snapshot },
  ];
  const cards = conflictCards(queue);
  assert.deepEqual(
    cards.map((card) => [card.title, card.keepTheirs, card.keepMine]),
    [["“Farol esquerdo”", "Manter excluído", "Recriar o item"]],
  );
  assert.deepEqual(settleConflict(queue, cards[0], "theirs"), [other]);
  const [made, kept] = settleConflict(queue, cards[0], "mine");
  assert.equal(kept, other);
  assert.ok(made.type === "createItem");
  assert.deepEqual(
    [made.itemId, made.item.name, made.item.brands.map((brand) => [brand.id, brand.quantity])],
    [
      SAW.id,
      "Farol esquerdo",
      [
        [BRAND_A, 2],
        [BRAND_B, 2],
      ],
    ],
  );
});

// Settles a delete of an item changed on the computer, a brand deleted there and a brand changed there, and checks what
// each choice sends.
test("Shared: a delete, a brand deleted and a brand changed on the computer are settled either way", () => {
  const remove: QueuedOperation = { id: "10000000-0000-4000-8000-000000000097", type: "deleteItem", itemId: SAW.id, seen: seenOf(SAW), at: AT, label: "Farol" };
  const changed: QueuedOperation[] = [{ ...remove, conflicts: [{ kind: "itemChanged" }] }];
  assert.deepEqual(settleConflict(changed, { operationId: remove.id, index: 0 }, "theirs"), []);
  const [forced] = settleConflict(changed, { operationId: remove.id, index: 0 }, "mine");
  assert.deepEqual([forced.type, "seen" in forced, forced.conflicts], ["deleteItem", false, undefined]);

  const edit = editing((form) => {
    form.brands[0].price = "R$ 209,90";
    form.brands = [form.brands[0]];
  });
  const snapshot = { ...SAW, brands: [{ ...SAW.brands[0], quantity: 4 }, SAW.brands[1]] };
  const queue: QueuedOperation[] = [
    {
      ...edit,
      conflicts: [
        { kind: "brandDeleted", brandId: BRAND_A },
        { kind: "brandChanged", brandId: BRAND_B },
      ],
      snapshot,
    },
  ];
  assert.deepEqual(
    conflictCards(queue).map((card) => [card.title, card.keepTheirs, card.keepMine]),
    [
      ["“Farol” · Arteb (AR-1)", "Manter removida", "Adicionar de volta"],
      ["“Farol” · Cibié (CB-1)", "Manter a marca", "Remover"],
    ],
  );
  const [readded] = settleConflict(queue, { operationId: edit.id, index: 0 }, "mine");
  assert.ok(readded.type === "updateItem");
  assert.deepEqual([readded.changes.brands?.[0].quantity, readded.seen?.brands?.[BRAND_A]], [4, undefined]);
  const [left] = settleConflict(queue, { operationId: edit.id, index: 0 }, "theirs");
  assert.ok(left.type === "updateItem");
  assert.equal(left.changes.brands, undefined, "no brand left to send");
  const [keptBrand] = settleConflict([readded], { operationId: edit.id, index: 0 }, "theirs");
  assert.ok(keptBrand.type === "updateItem");
  assert.equal(keptBrand.seen?.brands?.[BRAND_B], undefined, "a brand the phone didn't see is kept");
  const [removed] = settleConflict([readded], { operationId: edit.id, index: 0 }, "mine");
  assert.ok(removed.type === "updateItem");
  assert.deepEqual(removed.seen?.brands?.[BRAND_B], {});
});

// Queues an edit of a brand while the copy already holds a brand added on the computer, and checks the copy with the
// queue keeps that brand, as the server would.
test("Shared: the queue keeps over the copy a brand the phone never saw", () => {
  const added = { id: BRAND_C, partBrand: "Fitam", code: "FT-1", color: "N/A", location: null, quantity: 1, unitPriceCents: 9990, photos: [] };
  const copy = applyChanges(emptyCopy(), syncPageOf([{ ...SAW, brands: [...SAW.brands, added], quantity: 6 }]));
  const edit = editing((form) => {
    form.brands[1].location = "C-3";
  });
  const [item] = copyItems(withQueue(copy, [edit]));
  assert.deepEqual(
    item.brands.map((brand) => [brand.code, brand.location]),
    [
      ["AR-1", "A-1"],
      ["CB-1", "C-3"],
      ["FT-1", null],
    ],
  );
  assert.equal(editOf(itemFormBody(itemFormOf(SAW), []), SAW), null, "a form saved as it was changes nothing");
});
