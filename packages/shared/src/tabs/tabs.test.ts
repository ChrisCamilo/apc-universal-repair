import assert from "node:assert/strict";
import { test } from "node:test";
import { initialTab } from "./tabs.ts";

// Opens the saved tab when it is one of the tabs, and the first tab when nothing or a removed tab was saved.
test("Shared: the first tab opens unless a current tab was saved", () => {
  const ids = ["stock", "catalog"] as const;
  assert.equal(initialTab(ids, "catalog"), "catalog");
  assert.equal(initialTab(ids, null), "stock");
  assert.equal(initialTab(ids, "specs"), "stock");
});
