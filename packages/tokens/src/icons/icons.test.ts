import assert from "node:assert/strict";
import { test } from "node:test";
import { checkRingIcon, closeRingIcon, ICON_SIZES, ICON_STROKE, ICON_VIEWBOX, infoIcon, playIcon } from "./icons.ts";

/**
 * Lists the points a path goes through, for paths of moves and lines (M, l, h and v).
 * @param d The path's data, e.g. "M6 6l4 4M10 6l-4 4".
 * @returns Each point as [x, y], in the 16×16 grid.
 */
function pathPoints(d: string): [number, number][] {
  const points: [number, number][] = [];
  let [x, y] = [0, 0];
  for (const [, command, args] of d.matchAll(/([MlhvL])([^MlhvL]*)/g)) {
    const values = args.match(/-?\d*\.?\d+/g)!.map(Number);
    if (command === "M" || command === "L") {
      [x, y] = values;
    } else if (command === "l") {
      [x, y] = [x + values[0], y + values[1]];
    } else if (command === "h") {
      x += values[0];
    } else {
      y += values[0];
    }
    points.push([x, y]);
  }
  return points;
}

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

// Checks the ring of the check, X and "i" icons, with its stroke, stays inside the 16×16 grid, and the mark inside it
// keeps clear of the ring, so the toasts' icons read as one mark at every size.
test("Shared: the ringed toast icons stay within the grid, their marks inside their rings", () => {
  for (const [name, [ring, mark]] of Object.entries({ checkRingIcon, closeRingIcon, infoIcon })) {
    assert.ok(ring.kind === "circle" && mark.kind === "path", name);
    if (ring.kind !== "circle" || mark.kind !== "path") {
      return;
    }
    const reach = ring.r + ICON_STROKE / 2;
    assert.ok(ring.cx - reach >= 0 && ring.cx + reach <= ICON_VIEWBOX && ring.cy - reach >= 0 && ring.cy + reach <= ICON_VIEWBOX, name);
    for (const [x, y] of pathPoints(mark.d)) {
      assert.ok(Math.hypot(x - ring.cx, y - ring.cy) < ring.r - ICON_STROKE, `${name} ${x},${y}`);
    }
  }
});
