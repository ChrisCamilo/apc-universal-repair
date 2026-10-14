import assert from "node:assert/strict";
import { test } from "node:test";
import { alertIcon, checkRingIcon, closeRingIcon, infoIcon } from "../icons/icons.ts";
import { scales } from "../theme/tokens.ts";
import { TOAST_FADE_MS, TOAST_KIND_LOOKS, TOAST_KINDS } from "./toast.ts";

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
