import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { catalog } from "./locators/catalog.ts";
import { dashboard } from "./locators/dashboard.ts";
import { atNotebookSizes } from "./support/sizes.ts";
import type { Item } from "@apc/domain/items";
import { item } from "./data/items.ts";

// The inventory the code search looks in: a part for an engine the catalog has, and one for a model it has no sheet
// for.
const ITEMS: Item[] = [
  item({ code: "FRA-1000", name: "Pastilha de freio dianteira", vehicleBrand: "Chevrolet", vehicleModel: "Opala 4.1" }),
  item({ code: "ESC-200", name: "Amortecedor", vehicleBrand: "Ford", vehicleModel: "Escort" }),
];

// Every test here starts on the Dashboard with the test inventory.
test.use({ stock: { items: ITEMS } });

// Opens the Catalog tab and checks it starts on Chevrolet with its first engine's sheet, then picks the other Opala
// engine, Fiat and Ford, and checks the sheet follows each choice, Ford saying it has no sheet yet. Nothing scrolls
// sideways.
test("Web: the Catalog browses brands, models and engine sheets", { tag: [TEST_TAGS.catalog, TEST_TAGS.desktopOnly] }, async ({ page }) => {
  const tab = catalog(page);
  await page.goto("/inventory");
  await dashboard(page).tab("catalog").click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(tab.brand("Chevrolet", true)).toBeChecked();
  await expect(tab.sheet("opala25")).toBeVisible();

  await tab.model("4.1 L 6 cilindros").click();
  await expect(tab.sheet("opala41")).toBeVisible();

  await tab.brand("Fiat").click();
  await expect(tab.models("Fiat")).toBeVisible();
  await expect(tab.sheet("unoMille")).toBeVisible();

  await tab.brand("Ford").click();
  await expect(page.getByText("Nenhuma ficha cadastrada")).toBeVisible();
  await expect(page).not.toScrollSideways();
});

// Narrows the brands by name, looks for a model another brand has, then types a part code without its separator and
// checks the part is listed and reveals its vehicle, and a part for a model without a sheet says so; clearing the
// search drops the part list.
test("Web: the Catalog search finds brands, models and inventory parts", { tag: [TEST_TAGS.catalog, TEST_TAGS.desktopOnly] }, async ({ page }) => {
  const tab = catalog(page);
  await page.goto("/catalog");
  await tab.brandSearch.fill("fia");
  await expect(tab.brands).toHaveCount(1);
  await tab.brandSearch.fill("");

  await tab.search.fill("gol");
  await expect(tab.brand("Volkswagen", true)).toBeChecked();
  await expect(tab.sheet("golGts")).toBeVisible();

  await tab.search.fill("fra1000");
  await expect(tab.parts.getByRole("radio")).toHaveCount(1);
  await expect(tab.parts).toContainText("Serve no Chevrolet Opala 4.1");
  await expect(tab.brand("Chevrolet", true)).toBeChecked();
  await expect(tab.model("Opala", true)).toHaveAttribute("aria-current", "true");
  await expect(tab.sheet("opala41")).toBeVisible();

  await tab.search.fill("esc200");
  await expect(page.getByText("Ford Escort", { exact: true })).toBeVisible();
  await tab.search.fill("");
  await expect(tab.parts).toBeHidden();
  await expect(page).not.toScrollSideways();
});

// On a phone, opens the Catalog on its brand lines, taps Chevrolet and checks the header turns to the brand with a ←,
// opens the Opala down to its 1986 engines (the model and the version by their chevrons, as a tap on their names opens
// their sheets) and taps the 4.1, and checks its sheet shows under the path to it. ← goes
// back to the models, open on the engine just seen, and ← again to the brands under the tab's name. The bottom bar
// stays, and nothing scrolls sideways.
test("Web: on a phone the Catalog goes from a brand to an engine sheet and back", { tag: [TEST_TAGS.catalog, TEST_TAGS.mobileOnly] }, async ({ page }) => {
  const tab = catalog(page);
  const shell = dashboard(page);
  await page.goto("/catalog");
  await expect(tab.brandLines).toHaveCount(4);
  await expect(tab.brandSearch).toBeHidden();

  await tab.brandLine("Chevrolet").click();
  await expect(tab.title).toHaveText("Chevrolet");
  await tab.toggle("Opala").click();
  await tab.model("Terceira geração").click();
  await tab.toggle("Diplomata").click();
  await tab.model("1986").click();
  await tab.model("4.1 L 6 cilindros").click();
  await expect(tab.sheet("opala41")).toBeVisible();
  await expect(page.getByText("Opala › Terceira geração › Diplomata › 1986")).toBeVisible();
  await expect(shell.bar).toBeVisible();
  await expect(page).not.toScrollSideways();

  await tab.back("Voltar aos modelos").click();
  await expect(tab.model("4.1 L 6 cilindros")).toHaveAttribute("aria-selected", "true");
  await tab.back("Voltar às marcas").click();
  await expect(shell.title("catalog")).toBeVisible();
  await expect(tab.brandLines).toHaveCount(4);
});

// On a phone, types a part code without its separator and checks the part shows as an Inventory card, and a tap on it
// opens its engine's sheet; then a part for a model without a sheet opens its brand's models with the note.
test("Web: on a phone the Catalog search opens a part found by code", { tag: [TEST_TAGS.catalog, TEST_TAGS.mobileOnly] }, async ({ page }) => {
  const tab = catalog(page);
  await page.goto("/catalog");
  await tab.search.fill("fra1000");
  await expect(tab.partCards).toHaveCount(1);
  await expect(tab.partCards).toContainText("Pastilha de freio dianteira");
  await tab.partCards.click();
  await expect(tab.sheet("opala41")).toBeVisible();

  await tab.back("Voltar aos modelos").click();
  await tab.search.fill("esc200");
  await tab.partCards.click();
  await expect(tab.title).toHaveText("Ford");
  await expect(tab.model("Escort")).toHaveAttribute("aria-current", "true");
  await expect(page.getByText("Ford Escort", { exact: true })).toBeVisible();
  await expect(page).not.toScrollSideways();
});

// On a 1360×768 notebook, in full screen and in a window (1360×689), opens the Catalog tab and checks the page itself
// doesn't scroll, down or sideways, with the header at the top.
test("Web: on a 1360×768 notebook the Catalog tab doesn't scroll the page", { tag: [TEST_TAGS.catalog, TEST_TAGS.layout, TEST_TAGS.desktopOnly] }, async ({ page }) => {
  const shell = dashboard(page);
  await page.goto("/catalog");
  await expect(shell.tab("catalog")).toHaveAttribute("aria-selected", "true");
  await atNotebookSizes(page, async (size) => {
    expect(await page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight), size).toBe(0);
    await expect(page, size).not.toScrollSideways();
    expect((await shell.header.boundingBox())!.y, size).toBe(0);
  });
});
