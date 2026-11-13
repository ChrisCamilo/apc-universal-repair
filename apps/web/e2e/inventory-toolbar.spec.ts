import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { dataTable, dialog, tour } from "./locators/common.ts";
import { dashboard, userMenu } from "./locators/dashboard.ts";
import { deleteDialog, inventory, itemDetails, itemForm, manageLists } from "./locators/inventory.ts";
import { serveItems } from "./stubs/items.ts";
import { item, ITEMS } from "./data/items.ts";
import { openInventory } from "./support/inventory.ts";

// The Inventory's toolbar and the dialogs it opens: its buttons, a phone's round + and ⋯, and the dialogs' ×.

// Checks the toolbar has the search at its left edge and "Novo item", the last of the buttons, at its right edge, the
// panel's: at the minimum size and on a wide screen, where the search stops growing and the gap goes between it and
// the buttons. A phone has a round "+" in place of "Novo item" (see the test after this one).
test("Web: the toolbar buttons sit at the panel's right edge", { tag: [TEST_TAGS.inventory, TEST_TAGS.layout, TEST_TAGS.desktopOnly] }, async ({ page }) => {
  await openInventory(page);
  const { toolbar, searchBox, newItem } = inventory(page);
  const edges = async () => {
    const bar = (await toolbar.boundingBox())!;
    const search = (await searchBox.boundingBox())!;
    const button = (await newItem.boundingBox())!;
    return { searchLeft: search.x - bar.x, newItemRight: bar.x + bar.width - (button.x + button.width) };
  };
  for (const size of [page.viewportSize()!, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(size);
    const { searchLeft, newItemRight } = await edges();
    expect(Math.abs(searchLeft), `search at ${size.width}px`).toBeLessThanOrEqual(1);
    expect(Math.abs(newItemRight), `"Novo item" at ${size.width}px`).toBeLessThanOrEqual(1);
  }
});

// On a phone, with more items than fit the screen, checks the Inventory scrolls as a whole, the bottom bar staying at
// the bottom, and "Novo item" is a round 56px "+" at the bottom right, 16px above the bar, which stays put while the page
// scrolls and opens a new item's form; nothing scrolls sideways.
test("Web: on a phone the Inventory scrolls as a whole under a round + for a new item", { tag: [TEST_TAGS.inventory, TEST_TAGS.layout, TEST_TAGS.mobileOnly] }, async ({ page }) => {
  await serveItems(page, Array.from({ length: 16 }, (_, index) => item({ code: `P-${index + 1}`, name: `Peça ${index + 1}` })));
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  await expect(rows).toHaveCount(16);
  const { newItem } = inventory(page);
  const { width, height } = page.viewportSize()!;
  const plus = async () => (await newItem.boundingBox())!;
  const bar = (await dashboard(page).bar.boundingBox())!;
  const before = await plus();
  expect([before.width, before.height]).toEqual([56, 56]);
  expect(width - (before.x + before.width)).toBe(16);
  expect(bar.y - (before.y + before.height)).toBe(16);
  await page.mouse.move(width / 2, height / 2);
  await page.mouse.wheel(0, 1200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(600);
  expect((await plus()).y).toBe(before.y);
  await expect(page).not.toScrollSideways();
  await newItem.click();
  await expect(itemForm(page, "Novo item").root).toBeVisible();
});

// On a phone, checks the toolbar has no Gerenciar listas, Importar CSV or Exportar CSV, and the header's "⋯" opens
// them, with Tutorial do estoque, in a "Mais ações" sheet, a 56px row each; Escape closes it, and the tutorial's row
// closes it and starts the tutorial over the tab. (Each action's own test opens it from the sheet.)
test("Web: on a phone the other actions open from the header's ⋯", { tag: [TEST_TAGS.inventory, TEST_TAGS.mobileOnly] }, async ({ page }) => {
  await openInventory(page);
  const inv = inventory(page);
  for (const name of ["Gerenciar listas", "Importar CSV", "Exportar CSV"]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  }
  await inv.more.click();
  const actions = inv.moreSheet.getByRole("button");
  await expect(actions).toHaveText(["Gerenciar listas", "Importar CSV", "Exportar CSV", "Tutorial do estoque"]);
  for (const height of await actions.evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height))) {
    expect(height).toBe(56);
  }
  await page.keyboard.press("Escape");
  await expect(inv.moreSheet).toBeHidden();

  await inv.more.click();
  await inv.moreSheet.getByRole("button", { name: "Tutorial do estoque" }).click();
  await expect(inv.moreSheet).toBeHidden();
  await expect(tour(page).step("Abra o cadastro")).toBeVisible();
  await tour(page).skip.click();
  await expect(tour(page).card).toBeHidden();
});

// On a phone, opens Gerenciar listas, Importar CSV and Exportar CSV from the "Mais ações" sheet, and Sobre esta versão
// from Conta: each fills the screen, its × on top and its actions at the bottom in view, and the × closes it; the
// lists' pencils and trashes are 44px. Excluir item, a confirmation, stays a window centered on the screen, 16px from
// its sides.
test("Web: on a phone the lists, CSV and About dialogs fill the screen", { tag: [TEST_TAGS.inventory, TEST_TAGS.mobileOnly] }, async ({ page }) => {
  await openInventory(page);
  const inv = inventory(page);
  const menu = userMenu(page);
  const { width, height } = page.viewportSize()!;
  const openers = [
    { name: "Gerenciar listas", open: () => inv.manageLists.click(), action: "Fechar" },
    { name: "Importar CSV", open: () => inv.importCsv.click(), action: "Importar 0 itens" },
    { name: "Exportar CSV", open: () => inv.exportCsv.click(), action: "Exportar" },
    {
      name: "Sobre esta versão",
      open: async () => {
        await menu.trigger.click();
        await menu.item("Sobre esta versão").click();
      },
      action: "Fechar",
    },
  ];
  for (const { name, open, action } of openers) {
    await open();
    const { root, close } = dialog(page, name);
    await expect.poll(async () => root.boundingBox()).toEqual({ x: 0, y: 0, width, height });
    await expect(close).toBeInViewport();
    await expect(root.getByRole("button", { name: action }).last()).toBeInViewport();
    if (name === "Gerenciar listas") {
      const lists = manageLists(page);
      for (const button of [lists.rename("Categorias", "Motor"), lists.remove("Categorias", "Motor")]) {
        expect(await button.boundingBox()).toMatchObject({ width: 44, height: 44 });
      }
    }
    await close.click();
    await expect(root).toBeHidden();
  }

  await inv.remove("Filtro de óleo").click();
  const confirm = deleteDialog(page);
  await expect
    .poll(async () => {
      const box = (await confirm.root.boundingBox())!;
      return [box.x, box.width, Math.round(box.y + box.height / 2)];
    })
    .toEqual([16, width - 32, height / 2]);
  await confirm.cancel.click();
  await expect(confirm.root).toBeHidden();
});

// Closes Novo item, Editar item, Detalhes do item and Gerenciar listas with the round × at the top right of each (on a
// phone, the details with their ← in its place, and Editar item titled with the item's name), on screen without
// scrolling at both screen sizes, and checks nothing was sent.
test("Web: the item form and Manage lists close on the ×", { tag: [TEST_TAGS.inventory] }, async ({ page, isMobile }) => {
  await serveItems(page, [...ITEMS]);
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") {
      sent.push(`${request.method()} ${request.url()}`);
    }
  });
  await page.goto("/inventory");
  const inv = inventory(page);
  const openers = [
    { open: () => inv.newItem.click(), name: "Novo item" },
    { open: () => inv.edit("Filtro de óleo").click(), name: isMobile ? "Filtro de óleo" : "Editar item" },
    { open: () => inv.name("Filtro de óleo").click(), name: "Detalhes do item" },
    { open: () => inv.manageLists.click(), name: "Gerenciar listas" },
  ];
  for (const { open, name } of openers) {
    await open();
    const { root } = dialog(page, name);
    const close = isMobile && name === "Detalhes do item" ? itemDetails(page).back : dialog(page, name).close;
    await expect(close).toBeInViewport();
    await close.click();
    await expect(root).toBeHidden();
  }
  expect(sent).toEqual([]);
});
