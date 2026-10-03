import assert from "node:assert/strict";
import { test } from "node:test";
import { isMode, isStyle, MODES, popShadow, scales, sheenGradient, STYLES, themes, type ColorToken } from "./tokens.ts";

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
  ["warn", "canvas"],
  ["warn", "panel"],
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

/**
 * Lays a color over a background at an opacity, as color-mix(in srgb, color X%, transparent) does on it.
 * @param color Top color as `#RRGGBB`.
 * @param background Background as `#RRGGBB`.
 * @param opacity Opacity of the top color, from 0 to 1.
 * @returns The resulting color as `#RRGGBB`.
 */
function over(color: string, background: string, opacity: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  return (
    "#" +
    [1, 3, 5]
      .map((i) => Math.round(channel(color, i) * opacity + channel(background, i) * (1 - opacity)))
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
  );
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

// Checks the sheen is a white highlight at night and a black one by day, at the theme's opacity.
test("Shared: the sheen lightens at night and darkens by day", () => {
  assert.equal(sheenGradient(0.045, "night"), "linear-gradient(180deg, rgba(255, 255, 255, 0.045), transparent 45%)");
  assert.equal(sheenGradient(0.022, "day"), "linear-gradient(180deg, rgba(0, 0, 0, 0.022), transparent 45%)");
});

// Checks the shadow under floating lists is the black, offset and blurred shadow of the visual direction.
test("Shared: floating lists cast a soft black shadow", () => {
  assert.equal(popShadow(), "0px 14px 32px rgba(0, 0, 0, 0.28)");
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Lays the warn and danger row tints, at rest and on hover, over the canvas and the panel, and checks
    // the text color stays readable (AA) on every tinted row, since the status is shown by the tint alone.
    test(`Shared: ${style}/${mode} text stays readable on status rows`, () => {
      const { colors } = themes[style][mode];
      const tints = scales.statusTint;
      for (const background of [colors.canvas, colors.panel]) {
        for (const [color, opacity] of [
          [colors.warn, tints.warn],
          [colors.warn, tints.warnHover],
          [colors.danger, tints.danger],
          [colors.danger, tints.dangerHover],
        ] as const) {
          const row = over(color, background, opacity);
          const ratio = contrast(colors.text, row);
          assert.ok(ratio >= 4.5, `text on ${row} is ${ratio.toFixed(2)}:1`);
        }
      }
    });
  }
}
