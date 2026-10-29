import assert from "node:assert/strict";
import { test } from "node:test";
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_WINDOW_HEIGHT } from "@apc/shared/screens";
import { MIN_WINDOW_SIZE, openingContentSize, WINDOW_SIZE } from "./window.ts";

// The title bar and borders of a window on Windows 11 at 100%.
const FRAME = { width: 16, height: 39 };

// Checks the window opens at 1280×720 when the work area holds it, at what a 1366×768 notebook's work area holds when
// it doesn't, and never below its minimum, even on a smaller screen.
test("Desktop: the window opens at 1280×720, or at what the work area holds", () => {
  assert.deepEqual(openingContentSize({ width: 1920, height: 1032 }, FRAME), { width: 1280, height: 720 });
  assert.deepEqual(openingContentSize({ width: 1366, height: 720 }, FRAME), { width: 1280, height: 681 });
  assert.deepEqual(openingContentSize({ width: 1024, height: 600 }, FRAME), { width: 1280, height: 640 });
});

// Checks the window's sizes are the screen sizes of @apc/shared/screens, which the packaged app can't import.
test("Desktop: the window's sizes match the shared screen sizes", () => {
  assert.deepEqual(WINDOW_SIZE, { width: MIN_DESKTOP_WIDTH, height: MIN_DESKTOP_HEIGHT });
  assert.deepEqual(MIN_WINDOW_SIZE, { width: MIN_DESKTOP_WIDTH, height: MIN_WINDOW_HEIGHT });
});
