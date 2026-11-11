import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { DASHBOARD_TABS } from "@apc/ui-spec/tabs";
import { catalog } from "./locators/catalog.ts";

// The Catalog's tree edited in place on the desktop, with the catalog's routes answered by the stand-in, which keeps
// the changes for the test.

// While the Catalog tab is a work in progress its screen sits out of reach behind the notice, so these tests wait for
// it to come back; the notice itself is tested in dashboard.spec.ts.
test.skip(DASHBOARD_TABS.some((tab) => tab.id === "catalog" && tab.wip), "The Catalog tab is a work in progress (#151)");
// The issue that brings the Catalog back, shown with each of its tests in the report.
const CATALOG_ISSUE = { type: "issue", description: "https://github.com/ChrisCamilo/apc-universal-repair/issues/151" };

// Adds a model to Chevrolet, then a generation, a version and a year down from it with the dashed buttons of its empty
// branches; renames the version from its row, moves the model up past Monza, and deletes it after the dialog says what
// goes with it, which then leaves the tree.
test("Web: a model is added down to a year, renamed, moved and deleted", { tag: [TEST_TAGS.catalog, TEST_TAGS.desktopOnly], annotation: CATALOG_ISSUE }, async ({ page }) => {
  const tab = catalog(page);
  await page.goto("/catalog");
  await tab.newModel.click();
  await tab.field("Novo modelo em Chevrolet", "Nome").fill("Kadett");
  await page.keyboard.press("Enter");
  await expect(tab.node("Kadett")).toBeVisible();

  await tab.action("Nova geração em Kadett").last().click();
  await tab.field("Nova geração em Kadett", "Nome").fill("Primeira geração");
  await tab.field("Nova geração em Kadett", "De").fill("1989");
  await tab.field("Nova geração em Kadett", "Até").fill("1998");
  await page.keyboard.press("Enter");
  const kadett = tab.model("Kadett");
  await expect(kadett.getByText("1989–1998")).toBeVisible();

  await kadett.getByRole("button", { name: "Nova versão em Primeira geração" }).last().click();
  await tab.field("Nova versão em Primeira geração", "Nome").fill("GL");
  await page.keyboard.press("Enter");
  await tab.action("Novo ano em GL").last().click();
  await tab.field("Novo ano em GL", "Ano").fill("1990");
  await page.keyboard.press("Enter");
  await expect(kadett.getByText("1990", { exact: true })).toBeVisible();

  await tab.node("GL").hover();
  await tab.action("Renomear GL").click();
  await tab.field("Renomear GL", "Nome").fill("GLS");
  await page.keyboard.press("Enter");
  await expect(tab.node("GLS")).toBeVisible();

  await tab.node("Kadett").hover();
  await tab.action("Mover Kadett para cima").click();
  await expect(tab.topModels("Chevrolet")).toHaveText(["Chevette", "Opala", "Kadett", "Monza"]);

  await tab.node("Kadett").hover();
  await tab.action("Excluir Kadett").click();
  await expect(tab.deleteDialog("Kadett")).toContainText("Vão junto 1 geração, 1 versão, 1 ano.");
  await tab.deleteDialog("Kadett").getByRole("button", { name: "Excluir" }).click();
  await expect(tab.node("Kadett")).toHaveCount(0);
  await expect(page).not.toScrollSideways();
});
