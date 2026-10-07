import { expect, test, type Page } from "@playwright/test";
import type { Item } from "@apc/shared/items";
import { signIn } from "./session.ts";

// The API answers GET /items with these items, so the list is the same on every run without a database.
const ITEMS: Item[] = [
  item({ code: "W 712/95", name: "Filtro de óleo", category: "Motor", partBrand: "Mann", vehicleBrand: "Volkswagen", vehicleModel: "Gol", quantity: 8, minQuantity: 2, unitPriceCents: 3990, location: "A-2" }),
  item({ code: "BP-1020", name: "Pastilha de freio", category: "Freios", partBrand: "Cobreq", vehicleBrand: "Chevrolet", vehicleModel: null, position: "D", quantity: 2, minQuantity: 3, unitPriceCents: 123456, location: "B-10" }),
  item({ code: "BA-77", name: "Bomba d'água", category: "Arrefecimento", partBrand: "Urba", vehicleBrand: "Fiat", vehicleModel: "Uno", quantity: 0, minQuantity: 1, unitPriceCents: 13240, location: "C-1" }),
  item({ code: "AM-501", name: "Amortecedor", category: "Suspensão", partBrand: "Cofap", vehicleBrand: "Ford", vehicleModel: "Escort", position: "T", side: "LE", color: "Preto", quantity: 4, minQuantity: 1, unitPriceCents: 24900, location: "A-10" }),
];

/**
 * Fills in an item with the fields the list doesn't look at.
 * @param fields The fields that matter for the test.
 * @returns A complete item.
 */
function item(fields: Partial<Item> & Pick<Item, "code" | "name">): Item {
  return {
    id: crypto.randomUUID(),
    category: "Motor",
    partBrand: "Bosch",
    vehicleBrand: "Volkswagen",
    vehicleModel: null,
    position: "N/A",
    side: "N/A",
    color: "N/A",
    location: null,
    quantity: 1,
    minQuantity: 0,
    unitPriceCents: 100,
    photos: [],
    createdAt: "2026-10-03T12:00:00.000Z",
    updatedAt: "2026-10-03T12:00:00.000Z",
    ...fields,
  };
}

/**
 * Answers GET /items with the test items and opens the Inventory tab.
 * @param page The test's page.
 */
async function openInventory(page: Page) {
  await page.route("**/api/items", (route) => route.fulfill({ json: { items: ITEMS } }));
  await page.goto("/inventory");
  await expect(page.getByRole("table", { name: "Itens do estoque" })).toBeVisible();
}

// Every test here starts on the Dashboard, so a test user is logged in first.
test.beforeEach(async ({ page }) => {
  await signIn(page);
});

// Lists every item with the counter of the total and the stock alerts, the price in reais, "qualquer
// modelo" for an item without a vehicle model, N/A muted with its full name as a tooltip, and the low and
// out-of-stock rows tinted.
test("Web: the inventory lists every item with its stock alerts", async ({ page }, testInfo) => {
  await openInventory(page);
  await expect(page.getByTestId("inventory-count")).toHaveText("4 de 4 itens · 1 baixo · 1 esgotado");
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(1)).toHaveAttribute("data-status", "warn");
  await expect(rows.nth(2)).toHaveAttribute("data-status", "danger");
  await expect(rows.nth(0)).not.toHaveAttribute("data-status");
  await expect(rows.nth(2)).toContainText("Esgotado:");

  if (testInfo.project.name === "desktop") {
    const headers = await page.getByRole("columnheader").allTextContents();
    expect(headers).toEqual(["Foto", "Item", "Categoria", "Marca", "Veículo", "Posição", "Lado", "Cor", "Local", "Valor unit.", "Qtd.", "Ações"]);
    await expect(rows.nth(1)).toContainText(/R\$\s1\.234,56/);
    await expect(rows.nth(1)).toContainText("qualquer modelo");
    const position = rows.nth(1).getByTitle("Dianteiro");
    await expect(position).toHaveText("D");
    const sideNotApplicable = rows.nth(1).getByTitle("Lado não se aplica");
    await expect(sideNotApplicable).toHaveText("N/A");
    const muted = await sideNotApplicable.evaluate((el) => getComputedStyle(el).color);
    const text = await rows.nth(1).getByTitle("Dianteiro").evaluate((el) => getComputedStyle(el).color);
    expect(muted).not.toBe(text);
  } else {
    await expect(page.locator("thead")).toBeHidden();
    await expect(rows.nth(3)).toContainText("Suspensão · Cofap · Ford Escort · T · LE · Preto · A-10");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
});

// Searches by part code without separators, by name without accents, and for something that isn't there,
// checking the rows and the counter follow, and that clearing the search brings every item back.
test("Web: the search finds items by name or part code", async ({ page }) => {
  await openInventory(page);
  const search = page.getByRole("searchbox", { name: "Procure pelo nome ou código da peça" });
  const rows = page.locator("tbody tr");

  await search.fill("w712");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Filtro de óleo");
  await expect(page.getByTestId("inventory-count")).toHaveText("1 de 4 itens · 1 baixo · 1 esgotado");

  await search.fill("AGUA");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Bomba d'água");

  await search.fill("parafuso");
  await expect(page.getByRole("heading", { name: "Nenhum item encontrado" })).toBeVisible();
  await expect(page.getByTestId("inventory-count")).toHaveText("0 de 4 itens · 1 baixo · 1 esgotado");

  await page.getByRole("button", { name: "Limpar busca" }).click();
  await expect(rows).toHaveCount(4);
});

// Adds an item through "Novo item" against an API that keeps what it is sent: saving the blank form names the
// required fields, the filled-in form is posted with the writing rule applied, a toast confirms it and the list
// shows the new item without a reload; then the item's pencil opens it filled in and an edit is patched. Save is on
// screen without scrolling at both screen sizes.
test("Web: items are added and edited through the item form", async ({ page }) => {
  const stock = [...ITEMS];
  await page.route("**/api/items", async (route) => {
    if (route.request().method() === "POST") {
      const sent = route.request().postDataJSON();
      const saved = item({ ...sent, vehicleModel: sent.vehicleModel || null, location: sent.location || null });
      stock.push(saved);
      return route.fulfill({ status: 201, json: saved });
    }
    return route.fulfill({ json: { items: stock } });
  });
  await page.route("**/api/items/*", async (route) => {
    const sent = route.request().postDataJSON();
    const index = stock.findIndex((it) => route.request().url().endsWith(it.id));
    stock[index] = { ...stock[index], ...sent, vehicleModel: sent.vehicleModel || null, location: sent.location || null };
    return route.fulfill({ json: stock[index] });
  });
  await page.goto("/inventory");
  await page.getByRole("button", { name: "Novo item" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo item" });
  const save = dialog.getByRole("button", { name: "Salvar" });
  await expect(save).toBeInViewport();
  await save.click();
  await expect(dialog.getByText("Informe o código da peça.")).toBeVisible();

  await dialog.getByLabel("Código da peça").fill("ngk-b7");
  await dialog.getByLabel("Nome").fill("vela de ignição");
  await dialog.getByRole("combobox", { name: "Categoria" }).fill("Ignição");
  await dialog.getByRole("combobox", { name: "Marca da peça" }).fill("NGK");
  await dialog.getByRole("combobox", { name: "Marca do veículo" }).fill("Chevrolet");
  await dialog.getByLabel("Valor unitário (R$)").fill("34,9");
  await save.click();
  await expect(page.getByText("Item “Vela de ignição” cadastrado.")).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await expect(page.locator("tbody tr").last()).toContainText("NGK-B7");

  await page.getByRole("button", { name: "Editar Vela de ignição" }).click();
  const edit = page.getByRole("dialog", { name: "Editar item" });
  await expect(edit.getByLabel("Valor unitário (R$)")).toHaveValue("34,90");
  await edit.getByLabel("Quantidade", { exact: true }).fill("9");
  await edit.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Item “Vela de ignição” salvo.")).toBeVisible();
  await expect(page.locator("tbody tr").last()).toContainText("9");
});

// Deletes an item against an API that keeps what it is sent: the row's trash opens a confirmation naming the item
// and its code, Cancel and Escape leave the list as it was, and Excluir deletes it by its id, a toast confirms it
// and the list loses the row without a reload. Excluir is on screen without scrolling at both screen sizes.
test("Web: an item is deleted after confirming", async ({ page }) => {
  const stock = [...ITEMS];
  const deleted: string[] = [];
  await page.route("**/api/items", (route) => route.fulfill({ json: { items: stock } }));
  await page.route("**/api/items/*", async (route) => {
    const index = stock.findIndex((it) => route.request().url().endsWith(it.id));
    deleted.push(`${route.request().method()} ${stock[index].id}`);
    stock.splice(index, 1);
    return route.fulfill({ status: 204 });
  });
  await page.goto("/inventory");
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(4);

  const trash = page.getByRole("button", { name: "Excluir Bomba d'água" });
  const dialog = page.getByRole("dialog", { name: "Excluir item?" });
  await trash.click();
  await expect(dialog).toContainText("Bomba d'água (BA-77) sai do estoque. Essa ação não pode ser desfeita.");
  await expect(dialog.getByRole("button", { name: "Excluir" })).toBeInViewport();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toBeHidden();
  await trash.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(rows).toHaveCount(4);
  expect(deleted).toEqual([]);

  const id = ITEMS[2].id;
  await trash.click();
  await dialog.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText("Item “Bomba d'água” excluído.")).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(rows).toHaveCount(3);
  await expect(page.getByTestId("inventory-count")).toHaveText("3 de 3 itens · 1 baixo · 0 esgotados");
  expect(deleted).toEqual([`DELETE ${id}`]);
});

// Opens an item's details from its row against an API that keeps what it is sent: the details show the item as
// text, Editar unlocks the fields in place and Salvar alterações patches the item. The pencil still opens the edit
// form and Enter on a focused row opens the details. With "Abrir item ao clicar na linha" turned off in the user
// menu, a click on a row opens nothing.
test("Web: a row opens the item details, editable after Editar", async ({ page }) => {
  const stock = [...ITEMS];
  await page.route("**/api/items", (route) => route.fulfill({ json: { items: stock } }));
  await page.route("**/api/items/*", async (route) => {
    const index = stock.findIndex((it) => route.request().url().endsWith(it.id));
    stock[index] = { ...stock[index], ...route.request().postDataJSON() };
    return route.fulfill({ json: stock[index] });
  });
  await page.goto("/inventory");
  const rows = page.locator("tbody tr");

  await rows.nth(3).getByText("Amortecedor").click();
  const details = page.getByRole("dialog", { name: "Detalhes do item" });
  await expect(details.getByRole("group", { name: "Lado", exact: true })).toContainText("Lado esquerdo");
  await expect(details.getByRole("group", { name: "Local", exact: true })).toContainText("A-10");
  await expect(details.getByRole("textbox")).toHaveCount(0);
  await details.getByRole("button", { name: "Editar" }).click();
  const edit = page.getByRole("dialog", { name: "Editar item" });
  await expect(edit.getByLabel("Código da peça")).toBeFocused();
  await edit.getByLabel("Local").fill("A-11");
  await expect(edit.getByRole("button", { name: "Salvar alterações" })).toBeInViewport();
  await edit.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Item “Amortecedor” salvo.")).toBeVisible();
  await expect(edit).toBeHidden();
  expect(stock[3].location).toBe("A-11");

  await page.getByRole("button", { name: "Editar Filtro de óleo" }).click();
  await expect(page.getByRole("dialog", { name: "Editar item" })).toBeVisible();
  await page.keyboard.press("Escape");
  await rows.first().focus();
  await page.keyboard.press("Enter");
  await expect(details).toBeVisible();
  await details.getByRole("button", { name: "Fechar" }).click();

  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await page.getByRole("menuitemcheckbox", { name: /Abrir item ao clicar na linha/ }).click();
  await page.keyboard.press("Escape");
  await rows.first().getByText("Filtro de óleo").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(rows.first()).not.toHaveAttribute("tabindex");
});

// Works with an item's photos against an API that keeps what it is sent: the row shows the cover's thumbnail, which
// opens the photos large; "Adicionar foto" sends the kept photo and the new file, in order, and the viewer and the
// list follow; removing the cover sends what is left. Then a photo added in the edit form is sent after the item.
test("Web: item photos are added and removed from the list and the form", async ({ page }) => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  const cover = { id: crypto.randomUUID(), url: "/photos/cover.png", thumbUrl: "/photos/cover-thumb.webp" };
  const stock = ITEMS.map((it, index) => (index === 0 ? { ...it, photos: [cover] } : it));
  const sent: string[][] = [];
  await page.route("**/api/photos/*", (route) => route.fulfill({ body: png, contentType: "image/png" }));
  await page.route("**/api/items", (route) => route.fulfill({ json: { items: stock } }));
  await page.route("**/api/items/*", (route) => {
    const index = stock.findIndex((it) => route.request().url().endsWith(it.id));
    stock[index] = { ...stock[index], ...route.request().postDataJSON() };
    return route.fulfill({ json: stock[index] });
  });
  await page.route("**/api/items/*/photos", (route) => {
    const index = stock.findIndex((it) => route.request().url().endsWith(`${it.id}/photos`));
    const body = route.request().postDataBuffer()!.toString("latin1");
    const parts = [...body.matchAll(/name="(keep|photo)"(?:; filename="([^"]+)")?[^\r]*\r\n(?:Content-Type[^\r]*\r\n)?\r\n([^\r]*)/g)];
    sent.push(parts.map(([, name, file, value]) => (name === "keep" ? `keep ${value}` : `photo ${file}`)));
    const photos = parts.map(([, name, , value], position) =>
      name === "keep"
        ? stock[index].photos.find((photo) => photo.id === value)!
        : { id: crypto.randomUUID(), url: `/photos/new-${position}.png`, thumbUrl: `/photos/new-${position}-thumb.webp` },
    );
    stock[index] = { ...stock[index], photos };
    return route.fulfill({ json: stock[index] });
  });
  await page.goto("/inventory");

  const thumbnail = page.getByRole("button", { name: "Ver fotos de Filtro de óleo" });
  await expect(thumbnail.locator("img")).toHaveAttribute("src", "/api/photos/cover-thumb.webp");
  await thumbnail.click();
  const viewer = page.getByRole("dialog", { name: "Filtro de óleo" });
  await expect(viewer.getByRole("img")).toHaveAttribute("src", "/api/photos/cover.png");
  await viewer.locator('input[type="file"]').setInputFiles({ name: "lado.png", mimeType: "image/png", buffer: png });
  await expect(viewer.getByText("Foto adicionada")).toBeVisible();
  expect(sent).toEqual([[`keep ${cover.id}`, "photo lado.png"]]);
  await expect(viewer.getByRole("button", { name: /^Foto \d$/ })).toHaveCount(2);

  await viewer.getByRole("button", { name: "Foto 1" }).click();
  await viewer.getByRole("button", { name: "Remover esta foto" }).click();
  await page.getByRole("dialog", { name: "Remover esta foto?" }).getByRole("button", { name: "Remover" }).click();
  await expect(viewer.getByText("Foto removida")).toBeVisible();
  expect(sent[1]).toEqual([`keep ${stock[0].photos[0].id}`]);
  await viewer.getByRole("button", { name: "Fechar" }).click();
  await expect(thumbnail.locator("img")).toHaveAttribute("src", "/api/photos/new-1-thumb.webp");

  await page.getByRole("button", { name: "Editar Pastilha de freio" }).click();
  const edit = page.getByRole("dialog", { name: "Editar item" });
  await edit.locator('input[type="file"]').setInputFiles({ name: "frente.png", mimeType: "image/png", buffer: png });
  await edit.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Item “Pastilha de freio” salvo.")).toBeVisible();
  expect(sent[2]).toEqual(["photo frente.png"]);
  const padsThumbnail = page.getByRole("button", { name: "Ver fotos de Pastilha de freio" }).locator("img");
  await expect(padsThumbnail).toHaveAttribute("src", "/api/photos/new-0-thumb.webp");
});

// Filters the list against an API that filters what it is asked for: two categories in the Filtros menu go out as the
// list query only on Aplicar and leave their rows, with the button counting one filter; the stock status chips go
// one at a time; a vehicle brand narrows the vehicle models, each named with its brand; the position chips carry
// their full names; and "Limpar filtros" brings every item back with an empty query.
test("Web: the filters narrow the list through the API query", async ({ page }) => {
  const queries: string[] = [];
  await page.route(
    (url) => url.pathname === "/api/items",
    (route) => {
      const query = new URL(route.request().url()).searchParams;
      queries.push(query.toString());
      const categories = query.getAll("category");
      const status = query.get("status");
      const items = ITEMS.filter(
        (it) =>
          (categories.length === 0 || categories.includes(it.category)) &&
          (status !== "out" || it.quantity === 0) &&
          (status !== "low" || (it.quantity > 0 && it.quantity <= it.minQuantity)),
      );
      return route.fulfill({ json: { items } });
    },
  );
  await page.goto("/inventory");
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(4);

  await page.getByRole("button", { name: "Filtros" }).click();
  const menu = page.getByRole("dialog", { name: "Filtros do estoque" });
  await menu.getByRole("combobox", { name: "Categoria" }).click();
  await page.getByRole("option", { name: "Motor" }).click();
  await page.getByRole("option", { name: "Suspensão" }).click();
  await page.keyboard.press("Escape");
  await expect(menu.getByRole("button", { name: "N/A" }).first()).toHaveAttribute("title", "Posição não se aplica");
  expect(queries.at(-1)).toBe("");
  await menu.getByRole("button", { name: "Aplicar" }).click();
  await expect(rows).toHaveCount(2);
  expect(queries.at(-1)).toBe("category=Motor&category=Suspens%C3%A3o");
  await expect(page.getByRole("button", { name: "Filtros, 1 ativo" })).toBeVisible();
  await expect(page.getByTestId("inventory-count")).toHaveText("2 de 4 itens · 1 baixo · 1 esgotado");

  const low = page.getByRole("button", { name: "Estoque baixo" });
  const out = page.getByRole("button", { name: "Esgotado" });
  await low.click();
  await expect(page.getByRole("heading", { name: "Nenhum item encontrado" })).toBeVisible();
  expect(queries.at(-1)).toContain("status=low");
  await out.click();
  await expect(out).toHaveAttribute("aria-pressed", "true");
  await expect(low).toHaveAttribute("aria-pressed", "false");
  await out.click();
  await expect(rows).toHaveCount(2);

  await page.getByRole("button", { name: "Filtros, 1 ativo" }).click();
  await menu.getByRole("combobox", { name: "Marca do veículo" }).click();
  await page.getByRole("option", { name: "Ford" }).click();
  await page.keyboard.press("Escape");
  await menu.getByRole("combobox", { name: "Modelo do veículo" }).click();
  await expect(page.getByRole("option")).toHaveText(["Todos", "Escort · Ford"]);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(rows).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Filtros", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Limpar filtros" })).toHaveCount(0);
});

// Follows the list's feedback: skeleton rows while the API takes its time, then the error state when it fails, whose
// "Tentar de novo" loads the list once the API answers; a search that finds nothing offers "Limpar filtros", which
// brings every item back; and an empty stock offers "Novo item", which opens the form.
test("Web: the inventory shows loading, error and empty states", async ({ page }) => {
  let answer: "slow" | "fail" | "items" | "empty" = "slow";
  let release = () => {};
  await page.route("**/api/items", async (route) => {
    if (answer === "slow") {
      await new Promise<void>((resolve) => (release = resolve));
      return route.fulfill({ status: 500 });
    }
    if (answer === "fail") {
      return route.fulfill({ status: 500 });
    }
    return route.fulfill({ json: { items: answer === "items" ? ITEMS : [] } });
  });
  await page.goto("/inventory");
  await expect(page.getByTestId("loading-row")).toHaveCount(5);
  await expect(page.getByRole("status", { name: "Carregando o estoque" })).toBeAttached();

  answer = "fail";
  release();
  const error = page.getByRole("alert").filter({ hasText: "Não foi possível carregar o estoque" });
  await expect(error).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  answer = "items";
  await error.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(4);

  await page.getByRole("searchbox", { name: "Procure pelo nome ou código da peça" }).fill("parafuso");
  await expect(page.getByRole("heading", { name: "Nenhum item encontrado" })).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).last().click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await expect(page.getByRole("searchbox", { name: "Procure pelo nome ou código da peça" })).toHaveValue("");

  answer = "empty";
  await page.reload();
  await expect(page.getByRole("heading", { name: "Nenhum item cadastrado" })).toBeVisible();
  await page.getByRole("button", { name: "Novo item" }).last().click();
  await expect(page.getByRole("dialog", { name: "Novo item" })).toBeVisible();
});
