import assert from "node:assert/strict";
import { test } from "node:test";
import { ICON_SIZES, ICON_VIEWBOX } from "./icons.ts";

// Checks the icon sizes grow in the order they are listed, each one different, and that an icon drawn at the size
// given when none is (body) matches the grid it is drawn on, so it is never scaled.
test("Shared: icon sizes are distinct, in order, and body matches the grid", () => {
  const sizes = Object.values(ICON_SIZES);
  assert.deepEqual(
    sizes,
    [...sizes].sort((a, b) => a - b),
  );
  assert.equal(new Set(sizes).size, sizes.length);
  assert.equal(ICON_SIZES.body, ICON_VIEWBOX);
});
