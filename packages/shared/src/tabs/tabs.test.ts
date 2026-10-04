import assert from "node:assert/strict";
import { test } from "node:test";
import { dropTab, initialTab, moveTab } from "./tabs.ts";

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
