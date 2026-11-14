import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import type { Page } from "@playwright/test";
import type { Item } from "@apc/domain/items";
import { catalog } from "./locators/catalog.ts";
import { inventory, itemDetails } from "./locators/inventory.ts";
import { item } from "./data/items.ts";

// The stock: two parts that fit the Opala, one of them only its Diplomata of the third generation, and two that don't,
// for another Chevrolet model and for a Ford.
const ITEMS: Item[] = [
  item({ code: "FRA-1000", name: "Pastilha de freio dianteira", vehicleBrand: "Chevrolet", vehicleModel: "Opala" }),
  {
    ...item({ code: "JC-0412", name: "Junta do cabeçote", vehicleBrand: "Chevrolet", vehicleModel: "Opala" }),
    vehicles: [{ vehicleBrand: "Chevrolet", vehicleModel: "Opala", firstYear: 1980, lastYear: 1992, version: "Diplomata" }],
  },
  item({ code: "MZ-200", name: "Filtro de ar", vehicleBrand: "Chevrolet", vehicleModel: "Monza" }),
  item({ code: "ESC-200", name: "Amortecedor", vehicleBrand: "Ford", vehicleModel: "Escort" }),
];

// Every test here starts on the Dashboard with this stock.
test.use({ stock: { items: ITEMS } });

/**
 * Opens the Opala's sheet in the Catalog: a click on its name in the tree, after its brand's line on a phone.
 * @param page The test's page.
 * @param isMobile Whether the page is a phone's.
 */
async function openOpala(page: Page, isMobile: boolean) {
  const tab = catalog(page);
  await page.goto("/catalog");
  if (isMobile) {
    await tab.brandLine("Chevrolet").click();
  }
  await tab.node("Opala").click();
  await expect(tab.sheetTitle("Chevrolet Opala")).toBeVisible();
}

// Opens the Opala's sheet and checks it lists the two parts that fit it, then clicks one and checks the Inventory tab
// opens on its details.
test("Web: a part a car's sheet lists opens its details in the Inventory", { tag: [TEST_TAGS.catalog] }, async ({ page, isMobile }) => {
  const tab = catalog(page);
  await openOpala(page, isMobile);
  await expect(tab.carParts).toHaveCount(2);
  await expect(tab.carParts.first()).toContainText("Pastilha de freio dianteira");
  await expect(page).not.toScrollSideways();

  await tab.carParts.filter({ hasText: "Junta do cabeçote" }).click();
  await expect(page).toHaveURL(/\/inventory$/);
  const details = itemDetails(page);
  await expect(details.root).toBeVisible();
  await expect(details.root).toContainText("Junta do cabeçote");
});

// Clicks "Ver todas as peças" on the Opala's sheet and checks the Inventory opens with its vehicle's filters on, listing
// only its two parts, and "Limpar filtros" turns them off and lists every part again.
test("Web: a car's sheet opens the Inventory with its filters on", { tag: [TEST_TAGS.catalog] }, async ({ page, isMobile }) => {
  await openOpala(page, isMobile);
  await catalog(page).allParts.click();
  await expect(page).toHaveURL(/\/inventory$/);
  const inv = inventory(page);
  await expect(inv.filters).toHaveAccessibleName(/2 ativos/);
  await expect(inv.name("Pastilha de freio dianteira")).toBeVisible();
  await expect(inv.name("Junta do cabeçote")).toBeVisible();
  await expect(inv.name("Filtro de ar")).toHaveCount(0);
  await expect(inv.name("Amortecedor")).toHaveCount(0);

  await inv.clearFilters.first().click();
  await expect(inv.name("Amortecedor")).toBeVisible();
  await expect(inv.filters).toHaveAccessibleName("Filtros");
});
