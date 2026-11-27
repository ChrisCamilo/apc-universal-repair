import type { Page } from "@playwright/test";
import { CATALOG_TREE_NAMES } from "@apc/domain/catalog-tree-tutorial";
import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { dialog, form, tour } from "./locators/common.ts";
import { catalog } from "./locators/catalog.ts";
import { startTutorial } from "./locators/dashboard.ts";

// The guided tour of a model's tree in the Catalog, from the user menu's Tutoriais: on the catalog's first brand, it
// adds a test model, a generation, a version, a period and an engine with its sheet, a second version, and moves the
// second version up; the test model leaves the catalog, with its tree, when it ends.

const { model, generation, firstVersion, secondVersion } = CATALOG_TREE_NAMES;

/**
 * Reads the test model as the catalog's stand-in holds it.
 * @param page The test's page.
 * @returns Its generations' names, each with its versions' names, or null when it isn't in the catalog.
 */
async function testModel(page: Page): Promise<{ name: string; versions: string[] }[] | null> {
  return page.evaluate(async (name) => {
    const data = (await (await fetch("/api/catalog")).json()) as {
      brands: { models: { name: string; generations: { name: string; versions: { name: string }[] }[] }[] }[];
    };
    const found = data.brands[0].models.find((each) => each.name === name);
    return found ? found.generations.map((each) => ({ name: each.name, versions: each.versions.map((version) => version.name) })) : null;
  }, model);
}

// Runs the tour doing each step on the screen: on the desktop, in the tree's rows and their forms, with the engine's
// sheet beside it; on a phone, in the sheets the "⋯" and the empty branches' buttons open, the engine's sheet full
// screen, which opens the new engine, and the models again with ←. Concluir takes the test model out of the catalog.
test("Web: Montar a árvore de um modelo builds a test model's tree and moves a version", { tag: [TEST_TAGS.catalog] }, async ({ page, isMobile }) => {
  await page.goto("/inventory");
  const guide = tour(page);
  const tab = catalog(page);
  /** The form adding a level: inline on the desktop, in a sheet or a dialog on a phone. */
  const adding = (name: string) => (isMobile ? dialog(page, name) : form(page, name));
  /** Saves the form adding a level: Enter on the desktop, Adicionar on a phone. */
  const add = async (name: string) => (isMobile ? adding(name).button("Adicionar").click() : page.keyboard.press("Enter"));
  await startTutorial(page, "Montar a árvore de um modelo");
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(guide.card).toContainText("1 / 8");
  await expect(guide.step("Adicione um modelo")).toBeVisible();
  await tab.newModel.click();
  await adding("Novo modelo em Chevrolet").field("Nome").fill(model);
  await add("Novo modelo em Chevrolet");

  await expect(guide.step("Adicione uma geração")).toBeVisible();
  await tab.action(`Nova geração em ${model}`).last().click();
  await adding(`Nova geração em ${model}`).field("Nome").fill(generation);
  await adding(`Nova geração em ${model}`).field("De").fill("2001");
  await adding(`Nova geração em ${model}`).field("Até").fill("2005");
  await add(`Nova geração em ${model}`);

  await expect(guide.step("Adicione uma versão")).toBeVisible();
  await tab.action(`Nova versão em ${generation}`).last().click();
  await adding(`Nova versão em ${generation}`).field("Nome").fill(firstVersion);
  await add(`Nova versão em ${generation}`);

  await expect(guide.step("Adicione um período")).toBeVisible();
  await tab.action(`Novo período em ${firstVersion}`).last().click();
  await adding(`Novo período em ${firstVersion}`).field("De").fill("2001");
  await adding(`Novo período em ${firstVersion}`).field("Até").fill("2003");
  await add(`Novo período em ${firstVersion}`);

  await expect(guide.step("Adicione um motor")).toBeVisible();
  await tab.action("Novo motor em 2001–2003").last().click();
  const engine = adding("Novo motor em 2001–2003");
  await engine.field("Cilindrada (L)").fill("1,0");
  await engine.field("Cilindros").fill("4");
  await engine.choice("Dianteira").click();
  await engine.button("Salvar ficha").click();

  await expect(guide.step("Adicione outra versão")).toBeVisible();
  if (isMobile) {
    await tab.back("Voltar aos modelos").click();
    await tab.action(`Ações de ${generation}`).click();
    await dialog(page, generation).button("Nova versão").click();
  } else {
    await tab.node(generation).hover();
    await tab.action(`Nova versão em ${generation}`).first().click();
  }
  await adding(`Nova versão em ${generation}`).field("Nome").fill(secondVersion);
  await add(`Nova versão em ${generation}`);

  await expect(guide.step("Mude a ordem")).toBeVisible();
  if (isMobile) {
    await tab.action(`Ações de ${secondVersion}`).click();
    await dialog(page, secondVersion).button("Mover para cima").click();
  } else {
    await tab.node(secondVersion).hover();
    await tab.action(`Mover ${secondVersion} para cima`).click();
  }
  await expect(guide.step("Pronto!")).toBeVisible();
  expect(await testModel(page)).toEqual([{ name: generation, versions: [secondVersion, firstVersion] }]);
  await guide.done.click();
  await expect(guide.card).toBeHidden();
  await expect.poll(() => testModel(page)).toBeNull();
  await expect(tab.node(model)).toHaveCount(0);
});

// Runs the tour with "Fazer por mim" on every step: each change is made on the catalog and shows in the tree, the test
// model ending with its generation, the second version before the first, and the engine's sheet the user opened closes
// once the step does itself; Concluir takes it out of the catalog.
test("Web: Montar a árvore de um modelo runs with Fazer por mim on every step", { tag: [TEST_TAGS.catalog] }, async ({ page }) => {
  await page.goto("/inventory");
  const guide = tour(page);
  await startTutorial(page, "Montar a árvore de um modelo");
  for (const step of ["Adicione um modelo", "Adicione uma geração", "Adicione uma versão", "Adicione um período", "Adicione um motor", "Adicione outra versão", "Mude a ordem"]) {
    await expect(guide.step(step)).toBeVisible();
    if (step === "Adicione um motor") {
      await catalog(page).action("Novo motor em 2001–2003").last().click();
      await expect(page.getByRole("form", { name: "Novo motor em 2001–2003" })).toBeVisible();
    }
    await guide.doIt.click();
  }
  await expect(guide.step("Pronto!")).toBeVisible();
  await expect(page.getByRole("form", { name: "Novo motor em 2001–2003" })).toBeHidden();
  expect(await testModel(page)).toEqual([{ name: generation, versions: [secondVersion, firstVersion] }]);
  await expect(catalog(page).node(model)).toBeVisible();
  await guide.done.click();
  await expect.poll(() => testModel(page)).toBeNull();
});

// Skips the tour once the test model has a generation and checks the test model leaves the catalog with it.
test("Web: Montar a árvore de um modelo skipped takes the test model out of the catalog", { tag: [TEST_TAGS.catalog] }, async ({ page }) => {
  await page.goto("/inventory");
  const guide = tour(page);
  await startTutorial(page, "Montar a árvore de um modelo");
  for (const step of ["Adicione um modelo", "Adicione uma geração"]) {
    await expect(guide.step(step)).toBeVisible();
    await guide.doIt.click();
  }
  await expect(guide.step("Adicione uma versão")).toBeVisible();
  expect(await testModel(page)).toEqual([{ name: generation, versions: [] }]);
  await guide.skip.click();
  await expect(guide.card).toBeHidden();
  await expect.poll(() => testModel(page)).toBeNull();
});
