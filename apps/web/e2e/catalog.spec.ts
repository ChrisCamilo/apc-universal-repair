import { expect, test } from "@playwright/test";
import { ENGINE_SHEETS } from "@apc/shared/catalog";
import { signIn } from "./session.ts";

// Every test here starts on the Dashboard, so a test user is logged in first.
test.beforeEach(async ({ page }) => {
  await signIn(page);
});

// Opens the Catalog tab and checks it starts on Chevrolet with its first engine's sheet, then picks the other Opala
// engine, Fiat and Ford, and checks the sheet follows each choice, Ford saying it has no sheet yet. Nothing scrolls
// sideways at either screen size.
test("Web: the Catalog browses brands, models and engine sheets", async ({ page }) => {
  await page.goto("/inventory");
  await page.getByRole("tab", { name: "Catálogo" }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.getByRole("radio", { name: "Chevrolet" })).toBeChecked();
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
