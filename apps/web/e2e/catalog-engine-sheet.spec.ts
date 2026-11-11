import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { catalog } from "./locators/catalog.ts";

// An engine added to a year with its sheet, and an engine's sheet edited, on the desktop, with the catalog's routes
// answered by the stand-in, which keeps the changes for the test.

// Adds an engine to the Diplomata's empty 1985 from its dashed button and checks its sheet's title and the engine's
// name as they will be, then saves it and checks the engine is chosen in the tree with its sheet; edits that sheet's
// displacement and checks the engine's name and the title follow.
test("Web: an engine is added with its sheet, and the sheet is edited", { tag: [TEST_TAGS.catalog, TEST_TAGS.desktopOnly] }, async ({ page }) => {
  const tab = catalog(page);
  await page.goto("/catalog");
  await tab.action("Novo motor em 1985").click();
  await tab.field("Novo motor em 1985", "Cilindrada (L)").fill("3,8");
  await tab.field("Novo motor em 1985", "Cilindros").fill("6");
  await tab.choice("Novo motor em 1985", "Traseira").click();
  await tab.field("Novo motor em 1985", "Resumo").fill("O seis-cilindros do Diplomata de 1985.");
  await expect(tab.form("Novo motor em 1985")).toContainText("Na árvore: 3.8 L 6 cilindros");
  await tab.form("Novo motor em 1985").getByRole("button", { name: "Salvar ficha" }).click();
  await expect(tab.model("3.8 L 6 cilindros")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "1985 · Chevrolet Opala Diplomata 3.8" })).toBeVisible();

  await tab.editSheet.click();
  await tab.field("Ficha do 3.8 L 6 cilindros", "Cilindrada (L)").fill("4,1");
  await tab.form("Ficha do 3.8 L 6 cilindros").getByRole("button", { name: "Salvar ficha" }).click();
  await expect(tab.model("4.1 L 6 cilindros").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "1985 · Chevrolet Opala Diplomata 4.1" })).toBeVisible();
  await expect(page).not.toScrollSideways();
});
