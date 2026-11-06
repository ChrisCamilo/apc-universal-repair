import assert from "node:assert/strict";
import { test } from "node:test";
import { dropTab, initialTab, moveTab, orderTabs } from "./tabs.ts";

// Opens the saved tab when it is one of the tabs, and the first tab when nothing or a removed tab was saved.
test("Shared: the first tab opens unless a current tab was saved", () => {
  const ids = ["stock", "catalog"] as const;
  assert.equal(initialTab(ids, "catalog"), "catalog");
  assert.equal(initialTab(ids, null), "stock");
  assert.equal(initialTab(ids, "specs"), "stock");
});

// Drops tabs before and after others, to the left and to the right, and on themselves, and checks the dragged
// tab lands on that side of the target and the others keep their order.
test("Shared: a dropped tab lands on the side of the target it was dropped on", () => {
  const ids = ["stock", "catalog", "specs", "notes"] as const;
  assert.deepEqual(dropTab(ids, "stock", "specs", "after"), ["catalog", "specs", "stock", "notes"]);
  assert.deepEqual(dropTab(ids, "stock", "specs", "before"), ["catalog", "stock", "specs", "notes"]);
  assert.deepEqual(dropTab(ids, "notes", "stock", "before"), ["notes", "stock", "catalog", "specs"]);
  assert.deepEqual(dropTab(ids, "notes", "catalog", "after"), ["stock", "catalog", "notes", "specs"]);
  assert.deepEqual(dropTab(ids, "specs", "specs", "after"), ids);
});

// Moves a tab one place either way and checks it swaps with its neighbor, and that it can't go past the ends.
test("Shared: moving a tab swaps it with its neighbor and stops at the ends", () => {
  const ids = ["stock", "catalog", "specs"] as const;
  assert.deepEqual(moveTab(ids, "catalog", 1), ["stock", "specs", "catalog"]);
  assert.deepEqual(moveTab(ids, "catalog", -1), ["catalog", "stock", "specs"]);
  assert.equal(moveTab(ids, "stock", -1), null);
  assert.equal(moveTab(ids, "specs", 1), null);
});

// Puts back a saved order with a tab removed since and one added since, and checks the saved tabs keep their order,
// the removed one is dropped and the added one goes at the end.
test("Shared: a saved tab order comes back with new tabs at the end", () => {
  const ids = ["stock", "catalog", "specs"] as const;
  assert.deepEqual(orderTabs(ids, JSON.stringify(["catalog", "stock", "specs"])), ["catalog", "stock", "specs"]);
  assert.deepEqual(orderTabs(ids, JSON.stringify(["specs", "notes", "stock"])), ["specs", "stock", "catalog"]);
  assert.deepEqual(orderTabs(ids, JSON.stringify(["catalog", "catalog"])), ["catalog", "stock", "specs"]);
});

// Reads back nothing, broken JSON and JSON that isn't a list, and checks each leaves the display order.
test("Shared: anything but a saved order leaves the display order", () => {
  const ids = ["stock", "catalog"] as const;
  assert.deepEqual(orderTabs(ids, null), ["stock", "catalog"]);
  assert.deepEqual(orderTabs(ids, "[catalog"), ["stock", "catalog"]);
  assert.deepEqual(orderTabs(ids, JSON.stringify({ catalog: 0 })), ["stock", "catalog"]);
});
