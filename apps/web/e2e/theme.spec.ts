import { expect, test } from "./support/fixtures.ts";
import { rgb } from "./support/expect.ts";
import { dashboard } from "./locators/dashboard.ts";
import { MODES, STYLES, scales, themes } from "@apc/shared/theme";

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

      const tab = dashboard(page).tab("inventory");
      await expect(tab).toHaveCSS("color", rgb(theme.colors.accent));
      await expect(tab).toHaveCSS("font-family", new RegExp(`^"?${theme.displayFont}`));
      const tracking = +(theme.displayTracking * scales.fontSize.sm).toFixed(2);
      await expect(tab).toHaveCSS("letter-spacing", `${tracking}px`);
    });
  }
}
