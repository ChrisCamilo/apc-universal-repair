import { expect as base, type Page } from "@playwright/test";

// Playwright's expect with the web E2E's own matchers, which fixtures.ts hands to every spec.

export const expect = base.extend({
  /**
   * Whether the page is wider than its window, so it scrolls sideways; a spec checks it doesn't, with `.not`.
   * @param page The test's page.
   * @returns The match, with the page's and the window's widths when it fails.
   */
  async toScrollSideways(page: Page) {
    const [scrollWidth, innerWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    const pass = scrollWidth > innerWidth;
    return {
      pass,
      name: "toScrollSideways",
      expected: innerWidth,
      actual: scrollWidth,
      message: () =>
        `${this.utils.matcherHint("toScrollSideways", "page", "", { isNot: this.isNot })}\n\n` +
        `The page is ${scrollWidth}px wide in a ${innerWidth}px window.`,
    };
  },
});

/**
 * Converts a hex color to the `rgb(r, g, b)` form the browser reports for computed styles.
 * @param hex Color as `#RRGGBB`.
 * @returns The same color as `rgb(r, g, b)`.
 */
export function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}
