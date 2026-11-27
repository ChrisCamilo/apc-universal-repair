import type { Locator } from "@playwright/test";
import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { tour } from "./locators/common.ts";
import { catalog } from "./locators/catalog.ts";
import { startTutorial } from "./locators/dashboard.ts";
import { inventory } from "./locators/inventory.ts";
import { bell } from "./locators/notifications.ts";

// The explanations the user menu's Tutoriais starts, one of each feature: each opens its tab, if it has one, and walks
// its steps with Next only, the spotlight around each step's target, in the middle of the screen for a step with none.

/**
 * Tells whether the tour's spotlight is drawn around an element: its box holds the element's.
 * @param spotlight The spotlight.
 * @param target The element.
 * @returns True when it rings the element.
 */
async function rings(spotlight: Locator, target: Locator): Promise<boolean> {
  const [spot, box] = await Promise.all([spotlight.boundingBox(), target.boundingBox()]);
  return Boolean(spot && box) && spot!.x <= box!.x && spot!.y <= box!.y && spot!.x + spot!.width >= box!.x + box!.width && spot!.y + spot!.height >= box!.y + box!.height;
}

// Starts "As listas" from the Estoque and checks its first step rings "Mais ações" (the toolbar's menu, or a phone's
// "⋯"), with no "Fazer por mim", and its second sits in the middle with no spotlight; Concluir ends it.
test("Web: As listas explains the lists from Mais ações", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  await page.goto("/inventory");
  const guide = tour(page);
  await startTutorial(page, "As listas");
  await expect(guide.step("Gerenciar listas")).toBeVisible();
  await expect(guide.card).toContainText("As listas");
  await expect(guide.card).toContainText("1 / 2");
  await expect(guide.doIt).toBeHidden();
  await expect.poll(() => rings(guide.spotlight, inventory(page).more)).toBe(true);
  await guide.next.click();
  await expect(guide.step("Renomear e juntar")).toBeVisible();
  await expect(guide.spotlight).toBeHidden();
  await guide.done.click();
  await expect(guide.card).toBeHidden();
});

// Starts "Marcas e modelos" from the Estoque and checks it opens the Catálogo, its first step rings the brands (the
// desktop's list beside the models, or a phone's brand lines) and its second the search; Concluir ends it.
test("Web: Marcas e modelos opens the Catálogo and explains the brands and the search", { tag: [TEST_TAGS.catalog] }, async ({ page, isMobile }) => {
  await page.goto("/inventory");
  const guide = tour(page);
  const tab = catalog(page);
  await startTutorial(page, "Marcas e modelos");
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(guide.step("As marcas")).toBeVisible();
  await expect.poll(() => rings(guide.spotlight, isMobile ? tab.brandLines.first() : tab.brands.first())).toBe(true);
  await guide.next.click();
  await expect(guide.step("A busca")).toBeVisible();
  await expect.poll(() => rings(guide.spotlight, tab.search)).toBe(true);
  await guide.done.click();
  await expect(guide.card).toBeHidden();
});

// Starts the bell's explanation from the Estoque and checks the Estoque stays open and both steps ring the bell (Alertas
// on a phone); Pular tutorial ends it on the first step.
test("Web: the bell's explanation points at the bell on the open tab", { tag: [TEST_TAGS.notifications] }, async ({ page }) => {
  await page.goto("/inventory");
  const guide = tour(page);
  await startTutorial(page, "O sino e os avisos de estoque baixo");
  await expect(guide.step("O sino")).toBeVisible();
  await expect(page).toHaveURL(/\/inventory$/);
  await expect.poll(() => rings(guide.spotlight, bell(page).button)).toBe(true);
  await guide.next.click();
  await expect(guide.step("Estoque baixo")).toBeVisible();
  await expect.poll(() => rings(guide.spotlight, bell(page).button)).toBe(true);
  await guide.done.click();
  await expect(guide.card).toBeHidden();
  await startTutorial(page, "O sino e os avisos de estoque baixo");
  await guide.skip.click();
  await expect(guide.card).toBeHidden();
});
