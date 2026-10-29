import { test, type Page } from "@playwright/test";
import { TEST_TAGS } from "@apc/shared/test-tags";
import { expect } from "../e2e/support/expect.ts";
import { loginForm } from "../e2e/locators/auth.ts";
import { dataTable, tour } from "../e2e/locators/common.ts";
import { dashboard, logOut } from "../e2e/locators/dashboard.ts";
import { deleteItem, fillItem, inventory, itemForm } from "../e2e/locators/inventory.ts";

// The web app's demo, as GitHub Pages serves it (playwright.demo.config.ts): it opens logged in with its sample stock,
// works without the API, and a link to one of its routes reaches it. Each test's page starts the demo over.

/**
 * Opens the demo and skips the Inventory's tutorial, which the demo's user gets on every start.
 * @param page The test's page.
 * @param route The demo's route to open, e.g. "catalog"; the demo's own page when left out.
 */
async function openDemo(page: Page, route = "") {
  await page.goto(route);
  if (route === "") {
    await tour(page).skip.click();
  }
}

// Opens the demo's page and checks it lands logged in on the Inventory, with the tutorial over it, the notice above
// the app linking to the repository, and the sample stock; the page doesn't scroll sideways, nor down on the desktop,
// the notice taking its room. A phone's page scrolls as a whole, above the bottom bar.
test("Web: the demo opens logged in on the Inventory with the notice", { tag: [TEST_TAGS.inventory, TEST_TAGS.demo, TEST_TAGS.layout] }, async ({ page, isMobile }) => {
  const { skip } = tour(page);
  await page.goto("");
  await expect(skip).toBeVisible();
  await skip.click();
  await expect(page).toHaveURL(/\/apc-universal-repair\/demo\/inventory$/);
  const notice = page.getByRole("note");
  await expect(notice).toContainText("Modo demonstração");
  await expect(notice.getByRole("link", { name: "Ver no GitHub" })).toHaveAttribute("href", "https://github.com/ChrisCamilo/apc-universal-repair");
  await expect(inventory(page).table).toBeVisible();
  await expect(dataTable(page).rows.first()).toBeVisible();
  await expect(page).not.toScrollSideways();
  if (!isMobile) {
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(page.viewportSize()!.height);
  }
});

// Searches the sample stock and filters it to the parts out of stock, then creates an item, edits its quantity and
// deletes it, all answered by the demo's own API in the browser.
test("Web: the demo finds, filters, creates, edits and deletes items", { tag: [TEST_TAGS.inventory, TEST_TAGS.demo] }, async ({ page }) => {
  await openDemo(page);
  const inv = inventory(page);
  const { rows } = dataTable(page);
  await inv.search.fill("bpr6es");
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText("Vela de ignição");
  await inv.clearSearch.click();
  await inv.outOfStock.click();
  await expect(inv.count).toHaveText("4 de 30 itens · 5 baixos · 4 esgotados");
  await expect(rows).toHaveCount(4);
  await inv.outOfStock.click();
  await expect(rows).toHaveCount(25);

  await inv.newItem.click();
  await fillItem(page, "Novo item", { code: "rc-100", name: "retentor de câmbio", category: "Motor", partBrand: "Sabó", vehicleBrand: "Ford", unitPrice: "21,5" });
  await itemForm(page, "Novo item").save.click();
  await expect(page.getByText("Item “Retentor de câmbio” cadastrado.")).toBeVisible();
  await expect(rows.first()).toContainText("RC-100");

  await inv.edit("Retentor de câmbio").click();
  const edit = itemForm(page, "Editar item");
  await edit.quantity.fill("7");
  await edit.save.click();
  await expect(page.getByText("Item “Retentor de câmbio” salvo.")).toBeVisible();

  await deleteItem(page, "Retentor de câmbio");
  await expect(inv.edit("Retentor de câmbio")).toBeHidden();
});

// Opens a link to the Catalog, as Pages sends it through the site's 404.html, and checks the Catalog shows at that
// address, and still does after a reload.
test("Web: a link to one of the demo's routes opens it", { tag: [TEST_TAGS.dashboard, TEST_TAGS.demo] }, async ({ page }) => {
  const tab = dashboard(page).tab("catalog");
  await openDemo(page, "catalog");
  await expect(tab).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\/apc-universal-repair\/demo\/catalog$/);
  await page.reload();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\/apc-universal-repair\/demo\/catalog$/);
});

// Opens a path of the site that has no page and isn't the demo's, and checks the site's 404.html says so, with the way
// to the root page, instead of sending it to the demo.
test("Web: a path outside the demo shows the site's not-found page", { tag: [TEST_TAGS.dashboard, TEST_TAGS.demo] }, async ({ page }) => {
  const response = await page.goto("/apc-universal-repair/nada");
  expect(response!.status()).toBe(404);
  await expect(page.getByText("Esta página não existe.")).toBeVisible();
  await expect(page.getByRole("link", { name: "APC Universal Repair" })).toHaveAttribute("href", "/apc-universal-repair/");
  await expect(page).toHaveURL(/\/apc-universal-repair\/nada$/);
});

// Logs out with Sair and checks the login is filled in with the demo's user, so Entrar logs back in.
test("Web: after Sair, the demo's login is filled in", { tag: [TEST_TAGS.auth, TEST_TAGS.demo] }, async ({ page }) => {
  await openDemo(page);
  await logOut(page);
  await expect(page).toHaveURL(/\/apc-universal-repair\/demo\/login$/);
  const form = loginForm(page);
  await expect(form.username).toHaveValue("oficina");
  await expect(form.password).not.toHaveValue("");
  await form.submit.click();
  await expect(inventory(page).table).toBeVisible();
});
