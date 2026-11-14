import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { dataTable, dialog, toasts } from "./locators/common.ts";
import { deleteItem, inventory, manageLists } from "./locators/inventory.ts";
import { serveItems } from "./stubs/items.ts";
import { ITEMS } from "./data/items.ts";

// Manage lists: the categories, brands and models renamed, merged and cleaned up.

// Tidies the lists through "Gerenciar listas" against an API that keeps what it is sent: once its only item is
// deleted, a category shows no items and is deleted after confirming; a category is renamed in place and the list
// shows its items under the new name; and a category items use can't be deleted, but "Ver itens" shows them, filtered.
test("Web: the lists are renamed and cleaned up in Manage lists", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const stock = [...ITEMS];
  await serveItems(page, stock);
  await page.route("**/api/items/*", async (route) => {
    stock.splice(stock.findIndex((it) => route.request().url().endsWith(it.id)), 1);
    return route.fulfill({ status: 204 });
  });
  await page.goto("/inventory");
  const inv = inventory(page);
  const { rows } = dataTable(page);
  await deleteItem(page, "Bomba d'água");
  await expect(rows).toHaveCount(3);

  await inv.manageLists.click();
  const lists = manageLists(page);
  await expect(lists.closeText).toBeInViewport();
  const categories = lists.section("Categorias");
  await expect(categories.getByRole("listitem").filter({ hasText: "Arrefecimento" })).toContainText("sem itens");
  await lists.remove("Categorias", "Arrefecimento").click();
  const confirm = dialog(page, "Excluir “Arrefecimento”?").button("Excluir");
  await expect(confirm).toBeInViewport();
  await confirm.click();
  await expect(toasts(page).named("Categoria “Arrefecimento” excluída.")).toBeVisible();
  await expect(lists.remove("Categorias", "Arrefecimento")).toBeHidden();

  await lists.rename("Categorias", "Suspensão").click();
  await lists.newName("Suspensão").fill("suspensão e direção");
  await page.keyboard.press("Enter");
  await expect(toasts(page).named("Categoria renomeada para “Suspensão e direção”.")).toBeVisible();
  await lists.closeText.click();
  await expect(rows.filter({ hasText: "Amortecedor" })).toContainText("Suspensão e direção");

  await inv.manageLists.click();
  await lists.remove("Categorias", "Freios").click();
  await expect(lists.inUse).toContainText("1 item usa “Freios”.");
  await lists.showItems.click();
  await expect(lists.root).toBeHidden();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Pastilha de freio");
  await expect(inv.filters).toHaveAccessibleName("Filtros, 1 ativo");
});

// With the category filter on "Freios" through "Ver itens", renames "Freios" to the name of "Motor" against an API that
// keeps what it is sent: the merge is asked and done, and the filter follows it to "Motor", so the list shows the
// moved item with the one already there.
test("Web: a name merged into another keeps the filters on its items", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  await serveItems(page, [...ITEMS]);
  await page.goto("/inventory");
  const inv = inventory(page);
  const { rows } = dataTable(page);
  await inv.manageLists.click();
  const lists = manageLists(page);
  await lists.remove("Categorias", "Freios").click();
  await lists.showItems.click();
  await expect(rows).toHaveCount(1);

  await inv.manageLists.click();
  await lists.rename("Categorias", "Freios").click();
  await lists.newName("Freios").fill("motor");
  await page.keyboard.press("Enter");
  const merge = dialog(page, "Juntar “Freios” com “Motor”?");
  await expect(merge.root).toContainText("O item de “Freios” passa para “Motor”");
  await merge.button("Juntar").click();
  await expect(toasts(page).named("Categoria “Freios” juntada a “Motor”: 1 item mudou.")).toBeVisible();
  await expect(lists.rename("Categorias", "Freios")).toBeHidden();
  await lists.closeText.click();
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "Pastilha de freio" })).toContainText("Motor");
  await expect(inv.filters).toHaveAccessibleName("Filtros, 1 ativo");
});
