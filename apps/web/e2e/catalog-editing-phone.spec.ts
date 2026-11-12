import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { catalog } from "./locators/catalog.ts";
import { dialog } from "./locators/common.ts";

// The Catalog's tree and engine sheets edited on a phone, in bottom sheets and a full-screen form, with the catalog's
// routes answered by the stand-in, which keeps the changes for the test.

// On a phone, adds a brand and a model from beside their headings, then a generation, a version and a year from each
// branch's "⋯", and an engine from the year's "Novo motor" in the full-screen sheet form, which opens the engine's
// sheet; edits that sheet, renames the model and deletes it after the dialog says what goes with it.
test("Web: on a phone a brand is filled down to an engine sheet, renamed and deleted", { tag: [TEST_TAGS.catalog, TEST_TAGS.mobileOnly] }, async ({ page }) => {
  const tab = catalog(page);
  await page.goto("/catalog");
  await tab.newBrand.click();
  await dialog(page, "Nova marca").field("Nome").fill("Renault");
  await dialog(page, "Nova marca").button("Adicionar").click();
  await expect(tab.title).toHaveText("Renault");

  await tab.newModel.click();
  await dialog(page, "Novo modelo em Renault").field("Nome").fill("Clio");
  await dialog(page, "Novo modelo em Renault").button("Adicionar").click();
  await tab.action("Ações de Clio").click();
  await dialog(page, "Clio").button("Nova geração").click();
  const generation = dialog(page, "Nova geração em Clio");
  await generation.field("Nome").fill("Primeira geração");
  await generation.field("De").fill("1990");
  await generation.button("Adicionar").click();
  await expect(tab.model("Clio").getByText("1990–")).toBeVisible();

  await tab.action("Ações de Primeira geração").click();
  await dialog(page, "Primeira geração").button("Nova versão").click();
  await dialog(page, "Nova versão em Primeira geração").field("Nome").fill("RT");
  await page.keyboard.press("Enter");
  await tab.action("Novo ano em RT").click();
  await dialog(page, "Novo ano em RT").field("Ano").fill("1994");
  await page.keyboard.press("Enter");

  await tab.action("Novo motor em 1994").click();
  const engine = dialog(page, "Novo motor em 1994");
  await expect(engine.root).toBeInViewport({ ratio: 1 });
  await engine.field("Cilindrada (L)").fill("1,4");
  await engine.field("Cilindros").fill("4");
  await engine.choice("Dianteira").click();
  await engine.button("Salvar ficha").click();
  await expect(page.getByRole("heading", { name: "1994 · Renault Clio RT 1.4" })).toBeVisible();
  await expect(page.getByText("Clio › Primeira geração › RT › 1994")).toBeVisible();

  await tab.editSheet.click();
  const sheet = dialog(page, "Ficha do 1.4 L 4 cilindros");
  await sheet.field("Cilindrada (L)").fill("1,6");
  await sheet.button("Salvar ficha").click();
  await expect(page.getByRole("heading", { name: "1994 · Renault Clio RT 1.6" })).toBeVisible();

  await tab.back("Voltar aos modelos").click();
  await tab.action("Ações de Clio").click();
  await dialog(page, "Clio").button("Renomear").click();
  await dialog(page, "Renomear Clio").field("Nome").fill("Clio II");
  await dialog(page, "Renomear Clio").button("Salvar").click();
  await tab.action("Ações de Clio II").click();
  await dialog(page, "Clio II").button("Excluir…").click();
  const removal = dialog(page, "Excluir “Clio II”?");
  await expect(removal.root).toContainText("Vão junto 1 geração, 1 versão, 1 ano, 1 motor com ficha.");
  await removal.button("Excluir").click();
  await expect(tab.model("Clio II")).toHaveCount(0);
  await expect(page.getByText("Nenhum modelo nessa marca")).toBeVisible();
  await expect(page).not.toScrollSideways();
});

// On a phone, deletes Ford from its models screen with Excluir marca, and checks the screen goes back to the brands, one
// fewer.
test("Web: on a phone a brand is deleted from its models screen", { tag: [TEST_TAGS.catalog, TEST_TAGS.mobileOnly] }, async ({ page }) => {
  const tab = catalog(page);
  await page.goto("/catalog");
  await tab.brandLine("Ford").click();
  await tab.deleteBrand.click();
  await dialog(page, "Excluir “Ford”?").button("Excluir").click();
  await expect(tab.title).toHaveText("Catálogo");
  await expect(tab.brandLines).toHaveCount(3);
  await expect(page).not.toScrollSideways();
});
