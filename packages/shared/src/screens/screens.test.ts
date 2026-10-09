import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MIN_DESKTOP_HEIGHT,
  MIN_DESKTOP_WIDTH,
  MIN_MOBILE_HEIGHT,
  MIN_MOBILE_WIDTH,
  MOBILE_DESIGN_HEIGHT,
  MOBILE_DESIGN_WIDTH,
} from "./screens.ts";

// Checks the sizes AGENTS.md sets: a 1280×720 desktop minimum, a 360×780 phone minimum and phone screens designed at
// 390×844, so the design size is never below the minimum it adapts down to.
test("Shared: the screen sizes are the project's minimums and design size", () => {
  assert.deepEqual([MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT], [1280, 720]);
  assert.deepEqual([MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT], [360, 780]);
  assert.deepEqual([MOBILE_DESIGN_WIDTH, MOBILE_DESIGN_HEIGHT], [390, 844]);
  assert.ok(MOBILE_DESIGN_WIDTH >= MIN_MOBILE_WIDTH && MOBILE_DESIGN_HEIGHT >= MIN_MOBILE_HEIGHT);
});
