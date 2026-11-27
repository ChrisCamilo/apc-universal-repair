import type { Page } from "@playwright/test";
import { LISTS_TUTORIAL_NAMES } from "@apc/domain/lists-tutorial";
import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { tour } from "./locators/common.ts";
import { startTutorial } from "./locators/dashboard.ts";
import { inventory, manageLists } from "./locators/inventory.ts";

// The guided tour of the lists, from the user menu's Tutoriais: on two test categories it adds, it opens Gerenciar
// listas, renames the first, joins it into the second and deletes the one left, leaving the other categories as they were.

const { first, second, renamed } = LISTS_TUTORIAL_NAMES;

/**
 * Reads the categories' names as the lists' stand-in holds them.
 * @param page The test's page.
 * @returns The names.
 */
async function categories(page: Page): Promise<string[]> {
  return page.evaluate(async () => ((await (await fetch("/api/categories")).json()) as { name: string }[]).map((entry) => entry.name));
}

// Runs the tour doing each step on the screen: Gerenciar listas from Mais ações (a phone's "⋯"), the first test
// category renamed with its pencil, then renamed to the second's name, which asks to join them, Juntar, the second's
// trash and Excluir; Concluir leaves the categories as they were before the tour.
test("Web: Renomear e juntar nomes das listas renames, joins and deletes two test categories", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  await page.goto("/inventory");
  const before = await categories(page);
  const guide = tour(page);
  const lists = manageLists(page);
  await startTutorial(page, "Renomear e juntar nomes das listas");
  await expect(guide.card).toContainText("Renomear e juntar nomes das listas");
  await expect(guide.card).toContainText("1 / 7");
  await expect(guide.step("Abra Gerenciar listas")).toBeVisible();
  await expect.poll(() => categories(page)).toEqual([...before, first, second]);
  await inventory(page).manageLists.click();
  await expect(guide.step("Renomeie")).toBeVisible();
  await lists.rename("Categorias", first).click();
  await lists.newName(first).fill(renamed);
  await lists.newName(first).press("Enter");
  await expect(guide.step("Junte com outra")).toBeVisible();
  await lists.rename("Categorias", renamed).click();
  await lists.newName(renamed).fill(second);
  await lists.newName(renamed).press("Enter");
  await expect(guide.step("Confirme a junção")).toBeVisible();
  await page.getByRole("dialog", { name: `Juntar “${renamed}” com “${second}”?` }).getByRole("button", { name: "Juntar" }).click();
  await expect(guide.step("Exclua")).toBeVisible();
  await lists.remove("Categorias", second).click();
  await expect(guide.step("Confirme")).toBeVisible();
  await page.getByRole("dialog", { name: `Excluir “${second}”?` }).getByRole("button", { name: "Excluir" }).click();
  await expect(guide.step("Pronto!")).toBeVisible();
  await guide.done.click();
  await expect(guide.card).toBeHidden();
  expect(await categories(page)).toEqual(before);
});

// Runs the tour with "Fazer por mim" on every step: it opens Gerenciar listas, renames the first test category, joins it
// into the second and deletes the second, each change showing in the dialog; the categories end as they were.
test("Web: Renomear e juntar nomes das listas runs with Fazer por mim on every step", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  await page.goto("/inventory");
  const before = await categories(page);
  const guide = tour(page);
  const section = manageLists(page).section("Categorias");
  await startTutorial(page, "Renomear e juntar nomes das listas");
  await expect.poll(() => categories(page)).toEqual([...before, first, second]);
  for (const step of ["Abra Gerenciar listas", "Renomeie", "Junte com outra", "Confirme a junção", "Exclua", "Confirme"]) {
    await expect(guide.step(step)).toBeVisible();
    await guide.doIt.click();
    if (step === "Renomeie") {
      await expect(section.getByText(renamed)).toBeVisible();
    }
  }
  await expect(guide.step("Pronto!")).toBeVisible();
  await expect(section.getByText(/Categoria de teste/)).toHaveCount(0);
  expect(await categories(page)).toEqual(before);
  await guide.done.click();
  await expect(guide.card).toBeHidden();
});

// Skips the tour once the first test category is renamed and checks the test categories left are deleted, the others
// kept.
test("Web: Renomear e juntar nomes das listas skipped deletes the test categories", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  await page.goto("/inventory");
  const before = await categories(page);
  const guide = tour(page);
  await startTutorial(page, "Renomear e juntar nomes das listas");
  for (const step of ["Abra Gerenciar listas", "Renomeie"]) {
    await expect(guide.step(step)).toBeVisible();
    await guide.doIt.click();
  }
  await expect(guide.step("Junte com outra")).toBeVisible();
  expect((await categories(page)).toSorted()).toEqual([...before, renamed, second].toSorted());
  await guide.skip.click();
  await expect(guide.card).toBeHidden();
  await expect(manageLists(page).root).toBeHidden();
  await expect.poll(() => categories(page)).toEqual(before);
});
