import assert from "node:assert/strict";
import { test } from "node:test";
import { ICON_SIZES, ICON_STROKE, ICON_VIEWBOX, playIcon } from "./icons.ts";

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

// Checks the play icon's ring, with its stroke, stays inside the 16×16 grid, and its triangle's corners sit inside the
// ring, so it reads as one mark at every size.
test("Shared: the play icon stays within the grid, its triangle inside its ring", () => {
  const [ring, triangle] = playIcon;
  assert.equal(ring.kind, "circle");
  if (ring.kind !== "circle" || triangle.kind !== "path") {
    return;
  }
  const reach = ring.r + ICON_STROKE / 2;
  assert.ok(ring.cx - reach >= 0 && ring.cx + reach <= ICON_VIEWBOX && ring.cy - reach >= 0 && ring.cy + reach <= ICON_VIEWBOX);
  const [x, y, ...steps] = triangle.d.match(/-?\d*\.?\d+/g)!.map(Number);
  const corners = [[x, y], [x + steps[0], y + steps[1]], [x + steps[0] + steps[2], y + steps[1] + steps[3]]];
  for (const [cx, cy] of corners) {
    assert.ok(Math.hypot(cx - ring.cx, cy - ring.cy) < ring.r - ICON_STROKE, `${cx},${cy}`);
  }
});
