import type { Page } from "@playwright/test";
import { IMPORT_TUTORIAL_CSV, IMPORT_TUTORIAL_FILE } from "@apc/domain/import-tutorial";
import type { Item, ItemCreate } from "@apc/domain/items";
import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { dataTable, toasts, tour } from "./locators/common.ts";
import { startTutorial } from "./locators/dashboard.ts";
import { importDialog, inventory } from "./locators/inventory.ts";
import { savedItem, serveItems } from "./stubs/items.ts";
import { ITEMS } from "./data/items.ts";

// The guided tour of importing a CSV, from the user menu's Tutoriais: it opens Importar Peças, takes the template, reads
// the tour's sample file of two test items, imports them and points at them in the list; the test items leave the stock
// when it ends.

/**
 * Stands in for the item routes with an API that keeps what it is sent: an import adds its items, and a delete takes
 * one out.
 * @param page The test's page.
 * @returns The stock, as the API holds it, and the part codes each import sent.
 */
async function keepStock(page: Page): Promise<{ stock: Item[]; imported: string[][] }> {
  const stock = [...ITEMS];
  const imported: string[][] = [];
  await serveItems(page, stock);
  await page.route("**/api/items/import", async (route) => {
    const sent = route.request().postDataJSON().items as ItemCreate[];
    imported.push(sent.map((item) => item.brands[0].code));
    sent.forEach((item) => stock.unshift(savedItem(item)));
    return route.fulfill({ json: { created: sent.length, updated: 0 } });
  });
  await page.route("**/api/items/*", async (route) => {
    if (route.request().method() !== "DELETE") {
      return route.fallback();
    }
    stock.splice(
      stock.findIndex((held) => route.request().url().endsWith(held.id)),
      1,
    );
    return route.fulfill({ status: 204 });
  });
  return { stock, imported };
}

/**
 * Counts the tour's test items in stock.
 * @param stock The stock, as the API holds it.
 * @returns How many are there.
 */
function testItems(stock: Item[]): number {
  return stock.filter((held) => held.brands.some((brand) => brand.code.startsWith("TUTORIAL-CSV"))).length;
}

// Runs the tour doing each step on the screen: Importar Peças from Mais ações (a phone's "⋯"), Baixar modelo, the
// sample file chosen, the preview read with Próximo, Importar 2 itens, whose toast says both were created, and the
// first test item's row; Concluir takes both test items out of the stock.
test("Web: Importar um CSV imports the sample file's two test items", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const { stock, imported } = await keepStock(page);
  await page.goto("/inventory");
  const guide = tour(page);
  const importer = importDialog(page);
  await startTutorial(page, "Importar um CSV");
  await expect(guide.card).toContainText("Importar um CSV");
  await expect(guide.card).toContainText("1 / 7");
  await expect(guide.step("Abra Importar Peças")).toBeVisible();
  await inventory(page).importParts.click();
  await expect(guide.step("Pegue o modelo")).toBeVisible();
  const download = page.waitForEvent("download");
  await importer.template.click();
  expect((await download).suggestedFilename()).toBe("modelo-estoque.csv");
  await expect(guide.step("Escolha o arquivo")).toBeVisible();
  await importer.file.setInputFiles({ name: IMPORT_TUTORIAL_FILE, mimeType: "text/csv", buffer: Buffer.from(IMPORT_TUTORIAL_CSV) });
  await expect(guide.step("Confira antes")).toBeVisible();
  await expect(importer.rows).toHaveCount(2);
  await guide.next.click();
  await expect(guide.step("Importe")).toBeVisible();
  await importer.submit(2).click();
  await expect(toasts(page).named("2 itens criados")).toBeVisible();
  await expect(guide.step("Na lista")).toBeVisible();
  await expect(dataTable(page).rows.filter({ hasText: "TUTORIAL-CSV-1" })).toBeVisible();
  expect(imported).toEqual([["TUTORIAL-CSV-1", "TUTORIAL-CSV-2"]]);
  await guide.next.click();
  await expect(guide.step("Pronto!")).toBeVisible();
  await guide.done.click();
  await expect(guide.card).toBeHidden();
  await expect.poll(() => testItems(stock)).toBe(0);
});

// Runs the tour with "Fazer por mim" on every step it has, and Próximo on the ones that only show: the template is
// downloaded, the sample read and imported, with the same toast; Concluir takes the test items out of the stock.
test("Web: Importar um CSV runs with Fazer por mim on every step", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const { stock, imported } = await keepStock(page);
  await page.goto("/inventory");
  const guide = tour(page);
  await startTutorial(page, "Importar um CSV");
  for (const step of ["Abra Importar Peças", "Pegue o modelo", "Escolha o arquivo", "Confira antes", "Importe", "Na lista"]) {
    await expect(guide.step(step)).toBeVisible();
    if (step === "Pegue o modelo") {
      const download = page.waitForEvent("download");
      await guide.doIt.click();
      expect((await download).suggestedFilename()).toBe("modelo-estoque.csv");
    } else {
      await (step === "Confira antes" || step === "Na lista" ? guide.next : guide.doIt).click();
    }
    if (step === "Importe") {
      await expect(toasts(page).named("2 itens criados")).toBeVisible();
    }
  }
  await expect(guide.step("Pronto!")).toBeVisible();
  expect(imported).toEqual([["TUTORIAL-CSV-1", "TUTORIAL-CSV-2"]]);
  expect(testItems(stock)).toBe(2);
  await guide.done.click();
  await expect.poll(() => testItems(stock)).toBe(0);
});

// Imports the sample with "Fazer por mim", then skips the tour on the list, and checks the test items leave the stock.
test("Web: Importar um CSV skipped takes the test items out of the stock", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const { stock } = await keepStock(page);
  await page.goto("/inventory");
  const guide = tour(page);
  await startTutorial(page, "Importar um CSV");
  for (const step of ["Abra Importar Peças", "Pegue o modelo", "Escolha o arquivo", "Confira antes", "Importe"]) {
    await expect(guide.step(step)).toBeVisible();
    await (step === "Confira antes" ? guide.next : guide.doIt).click();
  }
  await expect(guide.step("Na lista")).toBeVisible();
  expect(testItems(stock)).toBe(2);
  await guide.skip.click();
  await expect(guide.card).toBeHidden();
  await expect.poll(() => testItems(stock)).toBe(0);
});
