import { expect, test, type Page } from "@playwright/test";

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
    await page.getByRole("button", { name: "Pular tutorial" }).click();
  }
}

// Opens the demo's page and checks it lands logged in on the Inventory, with the tutorial over it, the notice above
// the app linking to the repository, and the sample stock; the page scrolls neither way, the notice taking its room.
test("Web: the demo opens logged in on the Inventory with the notice", async ({ page }) => {
  await page.goto("");
  await expect(page.getByRole("button", { name: "Pular tutorial" })).toBeVisible();
  await page.getByRole("button", { name: "Pular tutorial" }).click();
  await expect(page).toHaveURL(/\/apc-universal-repair\/demo\/inventory$/);
  const notice = page.getByRole("note");
  await expect(notice).toContainText("Modo demonstração");
  await expect(notice.getByRole("link", { name: "Ver no GitHub" })).toHaveAttribute("href", "https://github.com/ChrisCamilo/apc-universal-repair");
  await expect(page.getByRole("table", { name: "Itens do estoque" })).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
  const { scrollWidth, scrollHeight } = await page.evaluate(() => {
    const { scrollWidth, scrollHeight } = document.documentElement;
    return { scrollWidth, scrollHeight };
  });
  expect(scrollWidth).toBe(page.viewportSize()!.width);
  expect(scrollHeight).toBe(page.viewportSize()!.height);
});

// Searches the sample stock, then creates an item, edits its quantity and deletes it, all answered by the demo's own
// API in the browser.
test("Web: the demo finds, creates, edits and deletes items", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("searchbox", { name: "Procure pelo nome ou código da peça" }).fill("bpr6es");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("Vela de ignição");
  await page.getByRole("button", { name: "Limpar busca" }).click();

  await page.getByRole("button", { name: "Novo item" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo item" });
  await dialog.getByLabel("Código da peça").fill("rc-100");
  await dialog.getByLabel("Nome").fill("retentor de câmbio");
  await dialog.getByRole("combobox", { name: "Categoria" }).fill("Motor");
  await dialog.getByRole("combobox", { name: "Marca da peça" }).fill("Sabó");
  await dialog.getByRole("combobox", { name: "Marca do veículo" }).fill("Ford");
  await dialog.getByLabel("Valor unitário (R$)").fill("21,5");
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Item “Retentor de câmbio” cadastrado.")).toBeVisible();
  await expect(page.locator("tbody tr").first()).toContainText("RC-100");

  await page.getByRole("button", { name: "Editar Retentor de câmbio" }).click();
  const edit = page.getByRole("dialog", { name: "Editar item" });
  await edit.getByLabel("Quantidade", { exact: true }).fill("7");
  await edit.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Item “Retentor de câmbio” salvo.")).toBeVisible();

  await page.getByRole("button", { name: "Excluir Retentor de câmbio" }).click();
  await page.getByRole("dialog", { name: "Excluir item?" }).getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByRole("button", { name: "Editar Retentor de câmbio" })).toBeHidden();
});

// Opens a link to the Catalog, as Pages sends it through the site's 404.html, and checks the Catalog shows at that
// address, and still does after a reload.
test("Web: a link to one of the demo's routes opens it", async ({ page }) => {
  await openDemo(page, "catalog");
  await expect(page.getByRole("tab", { name: "Catálogo", selected: true })).toBeVisible();
  await expect(page).toHaveURL(/\/apc-universal-repair\/demo\/catalog$/);
  await page.reload();
  await expect(page.getByRole("tab", { name: "Catálogo", selected: true })).toBeVisible();
  await expect(page).toHaveURL(/\/apc-universal-repair\/demo\/catalog$/);
});

// Opens a path of the site that has no page and isn't the demo's, and checks the site's 404.html says so, with the way
// to the root page, instead of sending it to the demo.
test("Web: a path outside the demo shows the site's not-found page", async ({ page }) => {
  const response = await page.goto("/apc-universal-repair/nada");
  expect(response!.status()).toBe(404);
  await expect(page.getByText("Esta página não existe.")).toBeVisible();
  await expect(page.getByRole("link", { name: "APC Universal Repair" })).toHaveAttribute("href", "/apc-universal-repair/");
  await expect(page).toHaveURL(/\/apc-universal-repair\/nada$/);
});

// Logs out with Sair and checks the login is filled in with the demo's user, so Entrar logs back in.
test("Web: after Sair, the demo's login is filled in", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/apc-universal-repair\/demo\/login$/);
  await expect(page.getByLabel("Usuário", { exact: true })).toHaveValue("oficina");
  await expect(page.getByLabel("Senha", { exact: true })).not.toHaveValue("");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("table", { name: "Itens do estoque" })).toBeVisible();
});
