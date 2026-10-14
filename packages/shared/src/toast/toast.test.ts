import assert from "node:assert/strict";
import { test } from "node:test";
import { alertIcon, checkRingIcon, closeRingIcon, infoIcon } from "../icons/icons.ts";
import { scales } from "../theme/tokens.ts";
import {
  readToastDuration,
  stepToastDuration,
  TOAST_DURATION,
  TOAST_FADE_MS,
  TOAST_KIND_LOOKS,
  TOAST_KINDS,
  toastDurationLabel,
} from "./toast.ts";

// Checks each kind has its own status color and icon, so no two kinds look alike: green with a check for success, red
// with an X for errors, blue with an "i" for info and yellow with a "!" for warnings.
test("Shared: every toast kind has its own color and icon", () => {
  assert.deepEqual(Object.keys(TOAST_KIND_LOOKS).sort(), [...TOAST_KINDS].sort());
  assert.deepEqual(
    TOAST_KINDS.map((kind) => [kind, TOAST_KIND_LOOKS[kind].color, TOAST_KIND_LOOKS[kind].onColor, TOAST_KIND_LOOKS[kind].icon]),
    [
      ["success", "success", "onSuccess", checkRingIcon],
      ["error", "danger", "onDanger", closeRingIcon],
      ["info", "info", "onInfo", infoIcon],
      ["warning", "warn", "onWarn", alertIcon],
    ],
  );
});

// Checks errors and warnings are read out at once and successes and infos politely, after what is being read.
test("Shared: only errors and warnings interrupt screen readers", () => {
  assert.deepEqual(
    TOAST_KINDS.filter((kind) => TOAST_KIND_LOOKS[kind].urgent),
    ["error", "warning"],
  );
});

// Checks a toast fades in the app's motion duration, the one web transitions take by default, so it fades the same
// on web and mobile, quickly enough not to hold the message back.
test("Shared: toasts fade in the app's motion duration", () => {
  assert.equal(TOAST_FADE_MS, scales.motion.durationMs);
  assert.ok(TOAST_FADE_MS > 0 && TOAST_FADE_MS <= 250);
});

// Steps the time a toast stays from the default up past the longest and down past the shortest, and checks it moves a
// second at a time and stops at 15 s and 2 s; it starts at 5 s and is written in seconds.
test("Shared: the toast's time steps a second at a time between 2 s and 15 s", () => {
  assert.equal(TOAST_DURATION.defaultMs, 5000);
  assert.equal(stepToastDuration(5000, 1), 6000);
  assert.equal(stepToastDuration(5000, -1), 4000);
  let ms: number = TOAST_DURATION.defaultMs;
  for (let press = 0; press < 20; press++) ms = stepToastDuration(ms, 1);
  assert.equal(ms, 15000);
  for (let press = 0; press < 20; press++) ms = stepToastDuration(ms, -1);
  assert.equal(ms, 2000);
  assert.equal(toastDurationLabel(5000), "5 s");
});

// Reads the time back from storage, and anything the user couldn't have picked (nothing, text, out of range, between
// steps) as the default.
test("Shared: the toast's time reads back from storage, and odd values as the default", () => {
  assert.equal(readToastDuration("3000"), 3000);
  for (const odd of [null, "", "abc", "1000", "16000", "3500"]) {
    assert.equal(readToastDuration(odd), TOAST_DURATION.defaultMs, String(odd));
  }
});
