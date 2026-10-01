import { expect, test } from "@playwright/test";
import { MODES, STYLES, scales, themes } from "@apc/shared/theme";

function rgb(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

for (const style of STYLES) {
  for (const mode of MODES) {
    test(`resolves the ${style}/${mode} tokens`, async ({ page }) => {
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
      await expect(page.getByTestId("health-status")).toHaveCSS("color", rgb(theme.colors.textMuted));

      const heading = page.getByRole("heading", { name: "APC Universal Repair" });
      await expect(heading).toHaveCSS("font-family", new RegExp(`^"?${theme.displayFont}`));
      const tracking = +(theme.displayTracking * scales.fontSize["4xl"]).toFixed(2);
      await expect(heading).toHaveCSS("letter-spacing", `${tracking}px`);
    });
  }
}
