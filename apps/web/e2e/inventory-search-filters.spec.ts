import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { dataTable, options } from "./locators/common.ts";
import { filtersMenu, inventory } from "./locators/inventory.ts";
import { serveItems } from "./stubs/items.ts";
import { item, ITEMS } from "./data/items.ts";
import { openInventory } from "./support/inventory.ts";

// The Inventory's search, filters and stock status chips, and the query they send.

// Searches by part code without separators, by name without accents, and for something that isn't there,
// checking the rows and the counter follow, and that clearing the search brings every item back.
test("Web: the search finds items by name or part code", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  await openInventory(page);
  const inv = inventory(page);
  const { rows } = dataTable(page);

  await inv.search.fill("w712");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Filtro de óleo");
  await expect(inv.count).toHaveText("1 de 4 itens · 1 baixo · 1 esgotado");

  await inv.search.fill("AGUA");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Bomba d'água");

  await inv.search.fill("parafuso");
  await expect(inv.nothingFound).toBeVisible();
  await expect(inv.count).toHaveText("0 de 4 itens · 1 baixo · 1 esgotado");

  await inv.clearSearch.click();
  await expect(rows).toHaveCount(4);
});

// Searches by the second of an item's original codes, written without its separators, and checks the list finds that
// item alone; its row keeps showing its brand's code.
test("Web: an item is found by its second original code", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const shoe = item({ code: "N-1210", name: "Pastilha dianteira", originalCodes: ["5U0 698 151", "5U0 698 151 A"] });
  await serveItems(page, [shoe, ...ITEMS]);
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  await expect(rows).toHaveCount(5);
  await inventory(page).search.fill("5u0698151a");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Pastilha dianteira");
  await expect(rows.first()).toContainText("N-1210");
});

// Filters the list against an API that filters what it is asked for: the Filtros menu's choices go out as the list
// query only on Aplicar, so the list doesn't reload at each choice. The stock status chips and a phone's filter sheet
// have tests of their own.
test("Web: the filters narrow the list through the API query", { tag: [TEST_TAGS.inventory, TEST_TAGS.desktopOnly] }, async ({ page }) => {
  // The queries of the list's page; the request for every item, with no query, is left out.
  const queries: string[] = [];
  await serveItems(page, ITEMS, (query) => query.has("pageSize") && queries.push(query.toString()));
  await page.goto("/inventory");
  const inv = inventory(page);
  const { rows } = dataTable(page);
  const option = options(page);
  await expect(rows).toHaveCount(4);

  await inv.filters.click();
  const menu = filtersMenu(page);
  await menu.field("Categoria").click();
  await option.named("Motor").click();
  await option.named("Suspensão").click();
  await page.keyboard.press("Escape");
  await expect(menu.chip("N/A").first()).toHaveAttribute("title", "Posição não se aplica");
  expect(queries.at(-1)).toBe("page=1&pageSize=25");
  await menu.apply.click();
  await expect(rows).toHaveCount(2);
  expect(queries.at(-1)).toBe("category=Motor&category=Suspens%C3%A3o&page=1&pageSize=25");
  await expect(inv.filters).toHaveAccessibleName("Filtros, 1 ativo");
  await expect(inv.count).toHaveText("2 de 4 itens · 1 baixo · 1 esgotado");

  // A stock status chip narrows the menu's filters further, as no low item is a Motor or Suspensão one; the chips on
  // their own are their test's.
  await inv.lowStock.click();
  await expect(inv.nothingFound).toBeVisible();
  await inv.lowStock.click();
  await expect(rows).toHaveCount(2);

  await inv.filters.click();
  await menu.field("Marca do veículo").click();
  await option.named("Ford").click();
  await page.keyboard.press("Escape");
  await menu.field("Modelo do veículo").click();
  await expect(option.all).toHaveText(["Todos", "Escort · Ford"]);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await inv.clearFilters.click();
  await expect(rows).toHaveCount(4);
  await expect(inv.filters).toHaveAccessibleName("Filtros");
  await expect(inv.clearFilters).toHaveCount(0);
});

// On a phone, filters and sorts the list from its round buttons, with no "Ordenar" select: the filter sheet starts
// with "Ordenar por" and each filter's choice, and sends nothing until "Ver n itens", so a phone's list doesn't reload
// at each tap.
test("Web: on a phone the filters and the sort open in bottom sheets", { tag: [TEST_TAGS.inventory, TEST_TAGS.mobileOnly] }, async ({ page }) => {
  const queries: string[] = [];
  await serveItems(page, ITEMS, (query) => query.has("pageSize") && queries.push(query.toString()));
  await page.goto("/inventory");
  const inv = inventory(page);
  const { rows } = dataTable(page);
  const menu = filtersMenu(page);
  const option = options(page);
  await expect(rows).toHaveCount(4);
  await expect(dataTable(page).sort).toHaveCount(0);

  await test.step("the sheet counts the items its filters would show before anything is sent, and applying sends them with its sort", async () => {
    await inv.filters.click();
    await expect(menu.sort).toHaveAccessibleName("Ordenar por Ordem de cadastro");
    await expect(menu.field("Categoria")).toHaveAccessibleName("Categoria Todas");
    await expect(menu.apply).toHaveText("Ver 4 itens");
    await menu.field("Categoria").click();
    await option.named("Motor").click();
    await option.named("Suspensão").click();
    await expect(menu.apply).toHaveText("Ver 2 itens");
    await page.keyboard.press("Escape");
    await expect(menu.field("Categoria")).toHaveAccessibleName("Categoria Motor +1");
    await menu.segment("Posição", "Traseira").click();
    await expect(menu.apply).toHaveText("Ver 1 item");
    await menu.sort.click();
    await option.named("Local (A → Z)").click();
    await expect(menu.sort).toHaveAccessibleName("Ordenar por Local (A → Z)");
    expect(queries.at(-1)).toBe("page=1&pageSize=25");
    await menu.apply.click();
    await expect(menu.root).toBeHidden();
    expect(queries.at(-1)).toBe("category=Motor&category=Suspens%C3%A3o&position=T&page=1&pageSize=25&sort=location&order=asc");
    await expect(rows.first()).toContainText("A-2");
    await expect(inv.filters).toHaveAccessibleName("Filtros, 2 ativos");
    await expect(inv.sort).toHaveAccessibleName("Ordenar, Local (A → Z)");
  });

  await test.step("Limpar turns the filters and the sort off, sent on Ver 4 itens", async () => {
    await inv.filters.click();
    await menu.clear.click();
    await expect(menu.sort).toHaveAccessibleName("Ordenar por Ordem de cadastro");
    await expect(menu.segment("Posição", "Todas")).toHaveAttribute("aria-checked", "true");
    await menu.apply.click();
    await expect(rows).toHaveCount(4);
    expect(queries.at(-1)).toBe("page=1&pageSize=25");
    await expect(inv.filters).toHaveAccessibleName("Filtros");
    await expect(inv.sort).toHaveAccessibleName("Ordenar");
  });

  await test.step("the round Ordenar sorts at once, and the sheet's Ordenar por shows that sort", async () => {
    await inv.sort.click();
    await option.named("Valor unitário (maior → menor)").click();
    await expect(rows.first()).toContainText("Pastilha de freio");
    expect(queries.at(-1)).toBe("page=1&pageSize=25&sort=price&order=desc");
    await expect(inv.sort).toHaveAccessibleName("Ordenar, Valor unitário (maior → menor)");
    await inv.filters.click();
    await expect(menu.sort).toHaveAccessibleName("Ordenar por Valor unitário (maior → menor)");
  });

  await test.step("a vehicle brand narrows the vehicle models, each named with its brand, and Escape leaves a field's options, then the sheet", async () => {
    await menu.field("Marca do veículo").click();
    await option.named("Ford").click();
    await page.keyboard.press("Escape");
    await menu.field("Modelo do veículo").click();
    await expect(option.all).toHaveText(["Todos", "Escort · Ford"]);
    await page.keyboard.press("Escape");
    await expect(option.all).toHaveCount(0);
    await expect(menu.root).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu.root).toBeHidden();
  });
});

// Presses each stock status chip on its own, against an API that filters what it is asked for: "Estoque baixo" lists
// only the item under its minimum and "Esgotado" only the one with none left, one chip at a time, the counter saying
// how many of the stock match; pressing it again lists every item.
test("Web: each stock status chip lists only its items", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  // The queries of the list's page; the request for every item, with no query, is left out.
  const queries: string[] = [];
  await serveItems(page, ITEMS, (query) => query.has("pageSize") && queries.push(query.toString()));
  await page.goto("/inventory");
  const inv = inventory(page);
  const { rows } = dataTable(page);

  await inv.lowStock.click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Pastilha de freio");
  await expect(inv.count).toHaveText("1 de 4 itens · 1 baixo · 1 esgotado");
  expect(queries.at(-1)).toContain("status=low");

  await inv.outOfStock.click();
  await expect(inv.outOfStock).toHaveAttribute("aria-pressed", "true");
  await expect(inv.lowStock).toHaveAttribute("aria-pressed", "false");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Bomba d'água");
  await expect(inv.count).toHaveText("1 de 4 itens · 1 baixo · 1 esgotado");

  await inv.outOfStock.click();
  await expect(rows).toHaveCount(4);
  await expect(inv.clearFilters).toHaveCount(0);
});

// Lists an item that fits two vehicles among the test items, and checks its row shows the first with "+1" and both in
// its tooltip, and that the vehicle brand filter of each vehicle finds it, the second's alone.
test("Web: an item fitting two vehicles is found by the filter of each", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const bumper = item({
    code: "PC-500",
    name: "Para-choque dianteiro",
    vehicles: [
      { vehicleBrand: "Volkswagen", vehicleModel: "Gol" },
      { vehicleBrand: "Renault", vehicleModel: "Clio" },
    ],
  });
  await serveItems(page, [bumper, ...ITEMS]);
  await page.goto("/inventory");
  const inv = inventory(page);
  const { rows } = dataTable(page);
  await expect(rows).toHaveCount(5);
  const vehicle = rows.first().getByTestId("inventory.inventory-tab.vehicle");
  await expect(vehicle).toHaveAttribute("title", "Volkswagen Gol, Renault Clio");
  await expect(vehicle).toContainText("Gol +1");

  /** Applies the vehicle brand filter of one brand. */
  const filterBy = async (brand: string) => {
    await inv.filters.click();
    const menu = filtersMenu(page);
    await menu.field("Marca do veículo").click();
    await options(page).named(brand, true).click();
    await page.keyboard.press("Escape");
    await menu.apply.click();
  };
  await filterBy("Renault");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Para-choque dianteiro");
  await inv.clearFilters.click();
  await expect(rows).toHaveCount(5);
  await filterBy("Volkswagen");
  await expect(rows.filter({ hasText: "Para-choque dianteiro" })).toHaveCount(1);
});
