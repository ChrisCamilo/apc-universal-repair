import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { catalog } from "./locators/catalog.ts";
import { form, toasts } from "./locators/common.ts";

// An engine added to a period with its sheet, an engine's sheet edited, and an engine copied to another period, on the
// desktop, with the catalog's routes
// answered by the stand-in, which keeps the changes for the test.

// Adds an engine to the Diplomata's empty 1985 from its dashed button and checks its sheet's title and the engine's
// name as they will be, then saves it and checks the engine is chosen in the tree with its sheet; edits that sheet's
// displacement and checks the engine's name and the title follow.
test("Web: an engine is added with its sheet, and the sheet is edited", { tag: [TEST_TAGS.catalog, TEST_TAGS.desktopOnly] }, async ({ page }) => {
  const tab = catalog(page);
  await page.goto("/catalog");
  await tab.action("Novo motor em 1985").click();
  const engine = form(page, "Novo motor em 1985");
  await engine.field("Cilindrada (L)").fill("3,8");
  await engine.field("Cilindros").fill("6");
  await engine.choice("Traseira").click();
  await engine.field("Resumo").fill("O seis-cilindros do Diplomata de 1985.");
  await expect(engine.root).toContainText("Na árvore: 3.8 L 6 cilindros");
  await engine.button("Salvar ficha").click();
  await expect(tab.model("3.8 L 6 cilindros")).toHaveAttribute("aria-selected", "true");
  await expect(tab.sheetTitle("1985 · Chevrolet Opala Diplomata 3.8")).toBeVisible();

  await tab.editSheet.click();
  const sheet = form(page, "Ficha do 3.8 L 6 cilindros");
  await sheet.field("Cilindrada (L)").fill("4,1");
  await sheet.button("Salvar ficha").click();
  await expect(tab.model("4.1 L 6 cilindros").first()).toBeVisible();
  await expect(tab.sheetTitle("1985 · Chevrolet Opala Diplomata 4.1")).toBeVisible();
  await expect(page).not.toScrollSideways();
});

// Copies the Diplomata 1986's 4.1 with its row's Copiar motor and pastes it into the empty 1985 with that period's Colar
// motor, which only shows once an engine is copied; then copies the 2.5 with Ctrl+C and pastes it into 1985 with Ctrl+V.
// Each says so in a toast, and the copies keep their sheets, titled by the period they are in.
test("Web: an engine is copied to another period, by its buttons and by Ctrl+C and Ctrl+V", { tag: [TEST_TAGS.catalog, TEST_TAGS.desktopOnly] }, async ({ page }) => {
  const tab = catalog(page);
  await page.goto("/catalog");
  const period = tab.model("1985", true);
  await test.step("Copiar motor and Colar motor copy the 4.1 into 1985", async () => {
    await tab.node("1985").hover();
    await expect(tab.action("Colar motor em 1985")).toHaveCount(0);
    await tab.model("4.1 L 6 cilindros").hover();
    await tab.action("Copiar motor 4.1 L 6 cilindros").click();
    await expect(toasts(page).named("Motor 4.1 L 6 cilindros copiado. Cole-o num período com Colar motor ou Ctrl+V.")).toBeVisible();
    await tab.node("1985").hover();
    await tab.action("Colar motor em 1985").click();
    await expect(toasts(page).named("Motor 4.1 L 6 cilindros colado em 1985.")).toBeVisible();
    await period.getByRole("treeitem", { name: "4.1 L 6 cilindros" }).click();
    await expect(tab.sheetTitle("1985 · Chevrolet Opala Diplomata 4.1")).toBeVisible();
  });

  await test.step("Ctrl+C on the 2.5 and Ctrl+V on 1985 copy it too", async () => {
    await tab.model("2.5 L 4 cilindros").focus();
    await page.keyboard.press("Control+c");
    await expect(toasts(page).named("Motor 2.5 L 4 cilindros copiado. Cole-o num período com Colar motor ou Ctrl+V.")).toBeVisible();
    await period.focus();
    await page.keyboard.press("Control+v");
    await expect(toasts(page).named("Motor 2.5 L 4 cilindros colado em 1985.")).toBeVisible();
    await expect(period.getByRole("treeitem", { name: "2.5 L 4 cilindros" })).toBeVisible();
  });
  await expect(page).not.toScrollSideways();
});
