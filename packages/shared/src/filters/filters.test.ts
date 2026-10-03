import assert from "node:assert/strict";
import { test } from "node:test";
import { activeFilterCount, clearedFilters, selectionSummary, toggleExclusive, toggleValue } from "./filters.ts";

// Counts only the filters with a value chosen, and clearing turns every filter off but keeps the keys.
test("Shared: filters count only when on and clear to empty", () => {
  const values = { cat: ["Freios", "Motor"], part: [], pos: ["D"] };
  assert.equal(activeFilterCount(values), 2);
  assert.deepEqual(clearedFilters(values), { cat: [], part: [], pos: [] });
  assert.equal(activeFilterCount(clearedFilters(values)), 0);
});

// Shows the all label with nothing chosen, the label alone for one choice, and the first plus a count for more.
test("Shared: a multiple choice summarizes as the first label plus a count", () => {
  assert.equal(selectionSummary([], "Todas"), "Todas");
  assert.equal(selectionSummary(["Freios"], "Todas"), "Freios");
  assert.equal(selectionSummary(["Freios", "Motor", "Suspensão"], "Todas"), "Freios +2");
});

// Turns a chip on, switches to another, then presses the one that is on and checks the group ends with none.
test("Shared: single-choice chips switch and turn off", () => {
  const low = toggleExclusive(null, "low");
  assert.equal(low, "low");
  const out = toggleExclusive(low, "out");
  assert.equal(out, "out");
  assert.equal(toggleExclusive(out, "out"), null);
});

// Adds and removes values and checks they stay in the order of the list, not the order picked.
test("Shared: multiple choices toggle and keep the list order", () => {
  const order = ["D", "T", "N/A"];
  const picked = toggleValue(toggleValue([], "N/A", order), "D", order);
  assert.deepEqual(picked, ["D", "N/A"]);
  assert.deepEqual(toggleValue(picked, "D", order), ["N/A"]);
});
