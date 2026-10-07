import { expect, test } from "@playwright/test";
import { ENGINE_SHEETS } from "@apc/shared/catalog";
import type { Item } from "@apc/shared/items";
import { signIn } from "./session.ts";

// The inventory the code search looks in: a part for an engine the catalog has, and one for a model it has no sheet
// for.
const ITEMS: Item[] = [
  item({ code: "FRA-1000", name: "Pastilha de freio dianteira", vehicleBrand: "Chevrolet", vehicleModel: "Opala 4.1" }),
  item({ code: "ESC-200", name: "Amortecedor", vehicleBrand: "Ford", vehicleModel: "Escort" }),
];

/**
 * Fills in an item with the fields the Catalog doesn't look at.
 * @param fields The fields that matter here.
 * @returns A complete item.
 */
function item(fields: Pick<Item, "code" | "name" | "vehicleBrand" | "vehicleModel">): Item {
  return {
    id: crypto.randomUUID(),
    category: "Freios",
    partBrand: "Cobreq",
    position: "N/A",
    side: "N/A",
    color: "N/A",
    location: null,
    quantity: 1,
    minQuantity: 0,
    unitPriceCents: 100,
    photos: [],
    createdAt: "2026-10-03T12:00:00.000Z",
    updatedAt: "2026-10-03T12:00:00.000Z",
    ...fields,
  };
}

// Every test here starts on the Dashboard, so a test user is logged in first, with the test inventory.
test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.route("**/api/items", (route) => route.fulfill({ json: { items: ITEMS } }));
});

// Opens the Catalog tab and checks it starts on Chevrolet with its first engine's sheet, then picks the other Opala
// engine, Fiat and Ford, and checks the sheet follows each choice, Ford saying it has no sheet yet. Nothing scrolls
// sideways at either screen size.
test("Web: the Catalog browses brands, models and engine sheets", async ({ page }) => {
  await page.goto("/inventory");
  await page.getByRole("tab", { name: "Catálogo" }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.getByRole("radio", { name: "Chevrolet", exact: true })).toBeChecked();
  await expect(page.getByRole("heading", { name: ENGINE_SHEETS["chevrolet-opala-diplomata-1986-2.5"].title })).toBeVisible();

  await page.getByRole("treeitem", { name: "4.1 L 6 cilindros" }).click();
  await expect(page.getByRole("heading", { name: ENGINE_SHEETS["chevrolet-opala-diplomata-1986-4.1"].title })).toBeVisible();

  await page.getByRole("radio", { name: "Fiat" }).click();
  await expect(page.getByRole("tree", { name: "Modelos Fiat" })).toBeVisible();
  await expect(page.getByRole("heading", { name: ENGINE_SHEETS["fiat-uno-mille-1991-1.0"].title })).toBeVisible();

  await page.getByRole("radio", { name: "Ford" }).click();
  await expect(page.getByText("Nenhuma ficha cadastrada")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
});

// Narrows the brands by name, looks for a model another brand has, then types a part code without its separator and
// checks the part is listed and reveals its vehicle, and a part for a model without a sheet says so; clearing the
// search drops the part list.
test("Web: the Catalog search finds brands, models and inventory parts", async ({ page }) => {
  await page.goto("/catalog");
  await page.getByRole("searchbox", { name: "Procure marca" }).fill("fia");
  await expect(page.getByRole("radio")).toHaveCount(1);
  await page.getByRole("searchbox", { name: "Procure marca" }).fill("");

  const search = page.getByRole("searchbox", { name: "Procure modelo ou código da peça" });
  await search.fill("gol");
  await expect(page.getByRole("radio", { name: "Volkswagen", exact: true })).toBeChecked();
  await expect(page.getByRole("heading", { name: ENGINE_SHEETS["volkswagen-gol-gts-1989-1.8"].title })).toBeVisible();

  await search.fill("fra1000");
  const parts = page.getByRole("radiogroup", { name: "Peças do estoque com esse código" });
  await expect(parts.getByRole("radio")).toHaveCount(1);
  await expect(parts).toContainText("Serve no Chevrolet Opala 4.1");
  await expect(page.getByRole("radio", { name: "Chevrolet", exact: true })).toBeChecked();
  await expect(page.getByRole("treeitem", { name: "Opala", exact: true })).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("heading", { name: ENGINE_SHEETS["chevrolet-opala-diplomata-1986-4.1"].title })).toBeVisible();

  await search.fill("esc200");
  await expect(page.getByText("Ford Escort", { exact: true })).toBeVisible();
  await search.fill("");
  await expect(parts).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
});
