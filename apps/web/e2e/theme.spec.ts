import { expect, test } from "@playwright/test";
import { MODES, STYLES, scales, themes } from "@apc/shared/theme";

/**
 * Converts a hex color to the `rgb(r, g, b)` form the browser reports for computed styles.
 * @param hex Color as `#RRGGBB`.
 * @returns The same color as `rgb(r, g, b)`.
 */
function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

for (const style of STYLES) {
  for (const mode of MODES) {
    // Switches style and mode on <html> and checks the Dashboard picks up that combination's canvas and text,
    // and the selected tab its accent, display font and tracking. Runs for every style and mode, at both
    // screen sizes.
    test(`Web: resolves the ${style}/${mode} tokens`, async ({ page }) => {
      const theme = themes[style][mode];
      await page.goto("/");
      await page.evaluate(
        ([s, m]) => {
          document.documentElement.dataset.style = s;
          document.documentElement.dataset.mode = m;
        },
        [style, mode],
      );

      await expect(page.locator("body")).toHaveCSS("background-color", rgb(theme.colors.canvas));
      await expect(page.locator("body")).toHaveCSS("color", rgb(theme.colors.text));

      const tab = page.getByRole("tab", { name: "Estoque" });
      await expect(tab).toHaveCSS("color", rgb(theme.colors.accent));
      await expect(tab).toHaveCSS("font-family", new RegExp(`^"?${theme.displayFont}`));
      const tracking = +(theme.displayTracking * scales.fontSize.sm).toFixed(2);
      await expect(tab).toHaveCSS("letter-spacing", `${tracking}px`);
    });
  }
}
