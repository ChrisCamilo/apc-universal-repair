import type { Page } from "@playwright/test";
import { expect } from "./fixtures.ts";
import { inventory } from "../locators/inventory.ts";
import { serveItems } from "../stubs/items.ts";
import { ITEMS } from "../data/items.ts";

// The Inventory specs' shared steps: opening the Inventory on the test items, and reading its layout.

/**
 * Answers GET /items with the test items and opens the Inventory tab.
 * @param page The test's page.
 */
export async function openInventory(page: Page) {
  await serveItems(page, ITEMS);
  await page.goto("/inventory");
  await expect(inventory(page).table).toBeVisible();
}

/**
 * Measures the Inventory's layout: how far the panel's bottom is from the window's, and whether the page scrolls.
 * @param page The test's page.
 * @returns The gap under the panel, in px, and the page's extra height (0 when it doesn't scroll).
 */
export async function layout(page: Page) {
  const panel = (await inventory(page).panel.boundingBox())!;
  const { height, pageExtra } = await page.evaluate(() => ({
    height: window.innerHeight,
    pageExtra: document.scrollingElement!.scrollHeight - window.innerHeight,
  }));
  return { gapBelow: height - (panel.y + panel.height), pageExtra };
}
