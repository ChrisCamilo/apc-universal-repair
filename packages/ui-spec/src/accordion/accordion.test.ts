import assert from "node:assert/strict";
import { test } from "node:test";
import { headerKeyTarget, toggleSection } from "./accordion.ts";

// Opens a closed section beside an open one, then closes the first, and checks each press changes its own section
// only, any number staying open.
test("Shared: an accordion's header opens and closes its own section", () => {
  assert.deepEqual(toggleSection(["inventory"], "catalog"), ["inventory", "catalog"]);
  assert.deepEqual(toggleSection(["inventory", "catalog"], "inventory"), ["catalog"]);
  assert.deepEqual(toggleSection([], "inventory"), ["inventory"]);
});

// Presses the arrows, Home and End on the headers, and checks the focus goes round at both ends, and any other key
// leaves it.
test("Shared: the keys move between an accordion's headers", () => {
  assert.deepEqual(
    [headerKeyTarget("ArrowDown", 0, 3), headerKeyTarget("ArrowDown", 2, 3), headerKeyTarget("ArrowUp", 0, 3), headerKeyTarget("ArrowUp", 2, 3)],
    [1, 0, 2, 1],
  );
  assert.deepEqual([headerKeyTarget("Home", 2, 3), headerKeyTarget("End", 0, 3), headerKeyTarget("Enter", 1, 3)], [0, 2, null]);
});
