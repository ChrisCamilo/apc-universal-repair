import assert from "node:assert/strict";
import { test } from "node:test";
import { isMode, isStyle, MODES, STYLES, themes, type ColorToken } from "./tokens.ts";

// Text-bearing pairs that must meet WCAG AA (4.5:1) in every style and mode.
const PAIRS: [ColorToken, ColorToken][] = [
  ["text", "canvas"],
  ["text", "panel"],
  ["textMuted", "canvas"],
  ["textMuted", "panel"],
  ["accent", "canvas"],
  ["accent", "panel"],
  ["onAccent", "accent"],
  ["danger", "canvas"],
  ["danger", "panel"],
  ["onDanger", "danger"],
];

/**
 * Computes the WCAG contrast ratio between two colors; the order of the colors doesn't matter.
 * @param a First color as `#RRGGBB`.
 * @param b Second color as `#RRGGBB`.
 * @returns Ratio from 1 (same color) to 21 (black on white).
 */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Computes the WCAG 2.x relative luminance of a color.
 * @param hex Color as `#RRGGBB`.
 * @returns Luminance from 0 (black) to 1 (white).
 */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

for (const style of STYLES) {
  for (const mode of MODES) {
    // Checks every text-bearing color pair of one style and mode reaches WCAG AA (4.5:1),
    // so text, muted text and the accent stay readable on canvas and panels.
    test(`Shared: ${style}/${mode} colors meet AA contrast`, () => {
      const { colors } = themes[style][mode];
      for (const [fg, bg] of PAIRS) {
        const ratio = contrast(colors[fg], colors[bg]);
        assert.ok(ratio >= 4.5, `${fg} on ${bg} is ${ratio.toFixed(2)}:1 (${colors[fg]} on ${colors[bg]})`);
      }
    });
  }
}

// Checks the guards accept every known style and mode and reject anything else, since they decide
// whether a value read back from storage can be used.
test("Shared: isStyle and isMode accept only known values", () => {
  for (const style of STYLES) assert.ok(isStyle(style));
  for (const mode of MODES) assert.ok(isMode(mode));
  for (const bad of [null, undefined, "", "dark", "light", "GT4", 1]) {
    assert.equal(isStyle(bad), false);
    assert.equal(isMode(bad), false);
  }
});
