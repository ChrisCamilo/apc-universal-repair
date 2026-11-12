import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { catalog } from "./locators/catalog.ts";
import { dialog, form } from "./locators/common.ts";

// The Catalog's tree edited in place on the desktop, with the catalog's routes answered by the stand-in, which keeps
// the changes for the test.

// Adds a model to Chevrolet, then a generation, a version and a year down from it with the dashed buttons of its empty
// branches; renames the version from its row, moves the model up past Monza, and deletes it after the dialog says what
// goes with it, which then leaves the tree.
test("Web: a model is added down to a year, renamed, moved and deleted", { tag: [TEST_TAGS.catalog, TEST_TAGS.desktopOnly] }, async ({ page }) => {
  const tab = catalog(page);
  await page.goto("/catalog");
  await tab.newModel.click();
  await form(page, "Novo modelo em Chevrolet").field("Nome").fill("Kadett");
  await page.keyboard.press("Enter");
  await expect(tab.node("Kadett")).toBeVisible();

  await tab.action("Nova geração em Kadett").last().click();
  const generation = form(page, "Nova geração em Kadett");
  await generation.field("Nome").fill("Primeira geração");
  await generation.field("De").fill("1989");
  await generation.field("Até").fill("1998");
  await page.keyboard.press("Enter");
  const kadett = tab.model("Kadett");
  await expect(kadett.getByText("1989–1998")).toBeVisible();

  await kadett.getByRole("button", { name: "Nova versão em Primeira geração" }).last().click();
  await form(page, "Nova versão em Primeira geração").field("Nome").fill("GL");
  await page.keyboard.press("Enter");
  await tab.action("Novo ano em GL").last().click();
  await form(page, "Novo ano em GL").field("Ano").fill("1990");
  await page.keyboard.press("Enter");
  await expect(kadett.getByText("1990", { exact: true })).toBeVisible();

  await tab.node("GL").hover();
  await tab.action("Renomear GL").click();
  await form(page, "Renomear GL").field("Nome").fill("GLS");
  await page.keyboard.press("Enter");
  await expect(tab.node("GLS")).toBeVisible();

  await tab.node("Kadett").hover();
  await tab.action("Mover Kadett para cima").click();
  await expect(tab.topModels("Chevrolet")).toHaveText(["Chevette", "Opala", "Kadett", "Monza"]);

  await tab.node("Kadett").hover();
  await tab.action("Excluir Kadett").click();
  const removal = dialog(page, "Excluir “Kadett”?");
  await expect(removal.root).toContainText("Vão junto 1 geração, 1 versão, 1 ano.");
  await removal.button("Excluir").click();
  await expect(tab.node("Kadett")).toHaveCount(0);
  await expect(page).not.toScrollSideways();
});
