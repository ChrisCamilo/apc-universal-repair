import type { Page } from "@playwright/test";
import { NOTEBOOK_HEIGHT, NOTEBOOK_WIDTH, NOTEBOOK_WINDOW_HEIGHT } from "@apc/shared/screens";
import { expect } from "./expect.ts";

/**
 * Sizes the page to a 1360×768 notebook in full screen, then in a window (1360×689 once the taskbar and the title bar
 * are taken off), and runs a check at each size once the page has taken it.
 * @param page The test's page.
 * @param check The check, given the size, as "1360×768", to name in its messages.
 */
export async function atNotebookSizes(page: Page, check: (size: string) => Promise<void>): Promise<void> {
  for (const height of [NOTEBOOK_HEIGHT, NOTEBOOK_WINDOW_HEIGHT]) {
    await page.setViewportSize({ width: NOTEBOOK_WIDTH, height });
    await expect.poll(() => page.evaluate(() => innerHeight)).toBe(height);
    await check(`${NOTEBOOK_WIDTH}×${height}`);
  }
}
