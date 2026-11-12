import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { catalog } from "./locators/catalog.ts";

// The Catalog's tree and engine sheets edited on a phone, in bottom sheets and a full-screen form, with the catalog's
// routes answered by the stand-in, which keeps the changes for the test.

// On a phone, adds a brand and a model from beside their headings, then a generation, a version and a year from each
// branch's "⋯", and an engine from the year's "Novo motor" in the full-screen sheet form, which opens the engine's
// sheet; edits that sheet, renames the model and deletes it after the dialog says what goes with it.
test("Web: on a phone a brand is filled down to an engine sheet, renamed and deleted", { tag: [TEST_TAGS.catalog, TEST_TAGS.mobileOnly] }, async ({ page }) => {
  const tab = catalog(page);
  await page.goto("/catalog");
  await tab.newBrand.click();
  await tab.field("Nova marca", "Nome").fill("Renault");
  await tab.dialogButton("Nova marca", "Adicionar").click();
  await expect(tab.title).toHaveText("Renault");

  await tab.newModel.click();
  await tab.field("Novo modelo em Renault", "Nome").fill("Clio");
  await tab.dialogButton("Novo modelo em Renault", "Adicionar").click();
  await tab.action("Ações de Clio").click();
  await tab.dialogButton("Clio", "Nova geração").click();
  await tab.field("Nova geração em Clio", "Nome").fill("Primeira geração");
  await tab.field("Nova geração em Clio", "De").fill("1990");
  await tab.dialogButton("Nova geração em Clio", "Adicionar").click();
  await expect(tab.model("Clio").getByText("1990–")).toBeVisible();

  await tab.action("Ações de Primeira geração").click();
  await tab.dialogButton("Primeira geração", "Nova versão").click();
  await tab.field("Nova versão em Primeira geração", "Nome").fill("RT");
  await page.keyboard.press("Enter");
  await tab.action("Novo ano em RT").click();
  await tab.field("Novo ano em RT", "Ano").fill("1994");
  await page.keyboard.press("Enter");

  await tab.action("Novo motor em 1994").click();
  const sheet = tab.dialog("Novo motor em 1994");
  await expect(sheet).toBeInViewport({ ratio: 1 });
  await tab.field("Novo motor em 1994", "Cilindrada (L)").fill("1,4");
  await tab.field("Novo motor em 1994", "Cilindros").fill("4");
  await tab.choice("Novo motor em 1994", "Dianteira").click();
  await tab.dialogButton("Novo motor em 1994", "Salvar ficha").click();
  await expect(page.getByRole("heading", { name: "1994 · Renault Clio RT 1.4" })).toBeVisible();
  await expect(page.getByText("Clio › Primeira geração › RT › 1994")).toBeVisible();

  await tab.editSheet.click();
  await tab.field("Ficha do 1.4 L 4 cilindros", "Cilindrada (L)").fill("1,6");
  await tab.dialogButton("Ficha do 1.4 L 4 cilindros", "Salvar ficha").click();
  await expect(page.getByRole("heading", { name: "1994 · Renault Clio RT 1.6" })).toBeVisible();

  await tab.back("Voltar aos modelos").click();
  await tab.action("Ações de Clio").click();
  await tab.dialogButton("Clio", "Renomear").click();
  await tab.field("Renomear Clio", "Nome").fill("Clio II");
  await tab.dialogButton("Renomear Clio", "Salvar").click();
  await tab.action("Ações de Clio II").click();
  await tab.dialogButton("Clio II", "Excluir…").click();
  await expect(tab.deleteDialog("Clio II")).toContainText("Vão junto 1 geração, 1 versão, 1 ano, 1 motor com ficha.");
  await tab.confirmDelete("Clio II").click();
  await expect(tab.model("Clio II")).toHaveCount(0);
  await expect(page.getByText("Nenhum modelo nessa marca")).toBeVisible();
  await expect(page).not.toScrollSideways();
});
