import { expect, test, type Page } from "@playwright/test";
import type { Item } from "@apc/shared/items";

// The API answers GET /items with these items, so the list is the same on every run without a database.
const ITEMS: Item[] = [
  item({ code: "W 712/95", name: "Filtro de óleo", category: "Motor", partBrand: "Mann", vehicleBrand: "Volkswagen", vehicleModel: "Gol", quantity: 8, minQuantity: 2, unitPriceCents: 3990, location: "A-2" }),
  item({ code: "BP-1020", name: "Pastilha de freio", category: "Freios", partBrand: "Cobreq", vehicleBrand: "Chevrolet", vehicleModel: null, position: "D", quantity: 2, minQuantity: 3, unitPriceCents: 123456, location: "B-10" }),
  item({ code: "BA-77", name: "Bomba d'água", category: "Arrefecimento", partBrand: "Urba", vehicleBrand: "Fiat", vehicleModel: "Uno", quantity: 0, minQuantity: 1, unitPriceCents: 13240, location: "C-1" }),
  item({ code: "AM-501", name: "Amortecedor", category: "Suspensão", partBrand: "Cofap", vehicleBrand: "Ford", vehicleModel: "Escort", position: "T", side: "LE", color: "Preto", quantity: 4, minQuantity: 1, unitPriceCents: 24900, location: "A-10" }),
];

/**
 * Fills in an item with the fields the list doesn't look at.
 * @param fields The fields that matter for the test.
 * @returns A complete item.
 */
function item(fields: Partial<Item> & Pick<Item, "code" | "name">): Item {
  return {
    id: crypto.randomUUID(),
    category: "Motor",
    partBrand: "Bosch",
    vehicleBrand: "Volkswagen",
    vehicleModel: null,
    position: "N/A",
    side: "N/A",
    color: "N/A",
    location: null,
    quantity: 1,
    minQuantity: 0,
    unitPriceCents: 100,
    createdAt: "2026-10-03T12:00:00.000Z",
    updatedAt: "2026-10-03T12:00:00.000Z",
    ...fields,
  };
}

/**
 * Answers GET /items with the test items and opens the Inventory tab.
 * @param page The test's page.
 */
async function openInventory(page: Page) {
  await page.route("**/api/items", (route) => route.fulfill({ json: { items: ITEMS } }));
  await page.goto("/inventory");
  await expect(page.getByRole("table", { name: "Itens do estoque" })).toBeVisible();
}

// Lists every item with the counter of the total and the stock alerts, the price in reais, "qualquer
// modelo" for an item without a vehicle model, N/A muted with its full name as a tooltip, and the low and
// out-of-stock rows tinted.
test("Web: the inventory lists every item with its stock alerts", async ({ page }, testInfo) => {
  await openInventory(page);
  await expect(page.getByTestId("inventory-count")).toHaveText("4 de 4 itens · 1 baixo · 1 esgotado");
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(1)).toHaveAttribute("data-status", "warn");
  await expect(rows.nth(2)).toHaveAttribute("data-status", "danger");
  await expect(rows.nth(0)).not.toHaveAttribute("data-status");
  await expect(rows.nth(2)).toContainText("Esgotado:");

  if (testInfo.project.name === "desktop") {
    const headers = await page.getByRole("columnheader").allTextContents();
    expect(headers).toEqual(["Foto", "Item", "Categoria", "Marca", "Veículo", "Posição", "Lado", "Cor", "Local", "Valor unit.", "Qtd."]);
    await expect(rows.nth(1)).toContainText(/R\$\s1\.234,56/);
    await expect(rows.nth(1)).toContainText("qualquer modelo");
    const position = rows.nth(1).getByTitle("Dianteiro");
    await expect(position).toHaveText("D");
    const sideNotApplicable = rows.nth(1).getByTitle("Lado não se aplica");
    await expect(sideNotApplicable).toHaveText("N/A");
    const muted = await sideNotApplicable.evaluate((el) => getComputedStyle(el).color);
    const text = await rows.nth(1).getByTitle("Dianteiro").evaluate((el) => getComputedStyle(el).color);
    expect(muted).not.toBe(text);
  } else {
    await expect(page.locator("thead")).toBeHidden();
    await expect(rows.nth(3)).toContainText("Suspensão · Cofap · Ford Escort · T · LE · Preto · A-10");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
});

// Searches by part code without separators, by name without accents, and for something that isn't there,
// checking the rows and the counter follow, and that clearing the search brings every item back.
test("Web: the search finds items by name or part code", async ({ page }) => {
  await openInventory(page);
  const search = page.getByRole("searchbox", { name: "Procure pelo nome ou código da peça" });
  const rows = page.locator("tbody tr");

  await search.fill("w712");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Filtro de óleo");
  await expect(page.getByTestId("inventory-count")).toHaveText("1 de 4 itens · 1 baixo · 1 esgotado");

  await search.fill("AGUA");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Bomba d'água");

  await search.fill("parafuso");
  await expect(page.getByText("Nenhum item encontrado.")).toBeVisible();
  await expect(page.getByTestId("inventory-count")).toHaveText("0 de 4 itens · 1 baixo · 1 esgotado");

  await page.getByRole("button", { name: "Limpar busca" }).click();
  await expect(rows).toHaveCount(4);
});
