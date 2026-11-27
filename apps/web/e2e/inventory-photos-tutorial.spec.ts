import type { Page } from "@playwright/test";
import type { Item } from "@apc/domain/items";
import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { dataTable, tour } from "./locators/common.ts";
import { startTutorial } from "./locators/dashboard.ts";
import { itemDetails, itemForm } from "./locators/inventory.ts";
import { savedItem, serveItems } from "./stubs/items.ts";
import { ITEMS } from "./data/items.ts";

// The guided tour of a brand's photos, from the user menu's Tutoriais: on the test item it makes, the user adds two
// photos, takes out the first, so the second is the cover, and saves; the test item leaves the stock when it ends.

// A 1×1 PNG, for the photos the user chooses and the API's photo files.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

/**
 * Stands in for the item and photo routes with an API that keeps what it is sent: creates, edits, deletes and each
 * brand's photos change the stock the list shows.
 * @param page The test's page.
 * @returns The stock, as the API holds it, and the photos each photo save sent, as "keep <id>" or "photo <file name>".
 */
async function keepStock(page: Page): Promise<{ stock: Item[]; sent: string[][] }> {
  const stock = [...ITEMS];
  const sent: string[][] = [];
  await page.route("**/api/photos/*", (route) => route.fulfill({ body: PNG, contentType: "image/png" }));
  await page.route("**/api/items", async (route) => {
    const saved = savedItem(route.request().postDataJSON());
    stock.unshift(saved);
    return route.fulfill({ status: 201, json: saved });
  });
  await serveItems(page, stock);
  await page.route("**/api/items/*", async (route) => {
    const index = stock.findIndex((held) => route.request().url().endsWith(held.id));
    if (route.request().method() === "DELETE") {
      stock.splice(index, 1);
      return route.fulfill({ status: 204 });
    }
    stock[index] = savedItem(route.request().postDataJSON(), stock[index]);
    return route.fulfill({ json: stock[index] });
  });
  await page.route("**/api/items/*/brands/*/photos", (route) => {
    const index = stock.findIndex((held) => route.request().url().includes(`/items/${held.id}/brands/`));
    const body = route.request().postDataBuffer()!.toString("latin1");
    const parts = [...body.matchAll(/name="(keep|photo)"(?:; filename="([^"]+)")?[^\r]*\r\n(?:Content-Type[^\r]*\r\n)?\r\n([^\r]*)/g)];
    sent.push(parts.map(([, name, file, value]) => (name === "keep" ? `keep ${value}` : `photo ${file}`)));
    const photos = parts.map(([, name, , value], position) =>
      name === "keep"
        ? stock[index].brands[0].photos.find((photo) => photo.id === value)!
        : { id: crypto.randomUUID(), url: `/photos/new-${position}.png`, thumbUrl: `/photos/new-${position}-thumb.webp` },
    );
    stock[index] = { ...stock[index], brands: [{ ...stock[index].brands[0], photos }, ...stock[index].brands.slice(1)] };
    return route.fulfill({ json: stock[index] });
  });
  return { stock, sent };
}

/**
 * Tells whether the test item is in stock.
 * @param stock The stock, as the API holds it.
 * @returns True while it is there.
 */
function hasTestItem(stock: Item[]): boolean {
  return stock.some((held) => held.brands.some((brand) => brand.code === "TUTORIAL-001"));
}

// Runs the tour doing each step on the screen: the test item's row opens its details, Editar the edit, two photos
// chosen in the photo field, the first one's × leaves the second, now the cover, and Salvar alterações sends it alone;
// each step moves on by itself, and Concluir ends the tour, taking the test item out of the stock.
test("Web: Fotos de uma marca adds two photos to the test item, keeps the second and saves", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const { stock, sent } = await keepStock(page);
  await page.goto("/inventory");
  const guide = tour(page);
  const form = itemForm(page, "Editar item");
  await startTutorial(page, "Fotos de uma marca");
  await expect(guide.card).toContainText("Fotos de uma marca");
  await expect(guide.card).toContainText("1 / 6");
  await expect(guide.step("Abra o item de teste")).toBeVisible();
  await dataTable(page).rows.filter({ hasText: "TUTORIAL-001" }).click();
  await expect(guide.step("Libere a edição")).toBeVisible();
  await itemDetails(page).edit.click();
  await expect(guide.step("Adicione duas fotos")).toBeVisible();
  await form.photoFile.setInputFiles([
    { name: "frente.png", mimeType: "image/png", buffer: PNG },
    { name: "lado.png", mimeType: "image/png", buffer: PNG },
  ]);
  await expect(guide.step("Tire a primeira")).toBeVisible();
  await form.removePhoto(1).click();
  await expect(form.photos).toHaveCount(1);
  await expect(guide.step("Salve as fotos")).toBeVisible();
  await form.save.click();
  await expect(guide.step("Pronto!")).toBeVisible();
  expect(sent).toEqual([["photo lado.png"]]);
  await guide.done.click();
  await expect(guide.card).toBeHidden();
  await expect.poll(() => hasTestItem(stock)).toBe(false);
});

// Runs the tour with "Fazer por mim" on every step: it opens the test item, unlocks the edit, adds the two sample
// photos, takes out the first and saves the second alone; Concluir takes the test item out of the stock.
test("Web: Fotos de uma marca runs with Fazer por mim on every step", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const { stock, sent } = await keepStock(page);
  await page.goto("/inventory");
  const guide = tour(page);
  const form = itemForm(page, "Editar item");
  await startTutorial(page, "Fotos de uma marca");
  await expect.poll(() => hasTestItem(stock)).toBe(true);
  for (const step of ["Abra o item de teste", "Libere a edição", "Adicione duas fotos", "Tire a primeira", "Salve as fotos"]) {
    await expect(guide.step(step)).toBeVisible();
    if (step === "Tire a primeira") {
      await expect(form.photos).toHaveCount(2);
    }
    await guide.doIt.click();
  }
  await expect(guide.step("Pronto!")).toBeVisible();
  expect(sent).toEqual([["photo tutorial-photo-2.jpg"]]);
  await guide.done.click();
  await expect(guide.card).toBeHidden();
  await expect.poll(() => hasTestItem(stock)).toBe(false);
});

// Skips the tour once the sample photos are in the form and checks it closes the form and takes the test item out of
// the stock, its photos unsaved.
test("Web: Fotos de uma marca skipped takes the test item out of the stock", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const { stock, sent } = await keepStock(page);
  await page.goto("/inventory");
  const guide = tour(page);
  await startTutorial(page, "Fotos de uma marca");
  for (const step of ["Abra o item de teste", "Libere a edição", "Adicione duas fotos"]) {
    await expect(guide.step(step)).toBeVisible();
    await guide.doIt.click();
  }
  await expect(guide.step("Tire a primeira")).toBeVisible();
  await guide.skip.click();
  await expect(guide.card).toBeHidden();
  await expect(itemForm(page, "Editar item").root).toBeHidden();
  await expect.poll(() => hasTestItem(stock)).toBe(false);
  expect(sent).toEqual([]);
});
