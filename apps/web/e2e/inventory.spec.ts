import type { Page } from "@playwright/test";
import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/shared/test-tags";
import { rgb } from "./support/expect.ts";
import { atNotebookSizes } from "./support/sizes.ts";
import { dataTable, dialog, options, thumbnailImage, tour } from "./locators/common.ts";
import { dashboard, userMenu } from "./locators/dashboard.ts";
import { deleteDialog, deleteItem, fillItem, filtersMenu, importDialog, inventory, itemDetails, itemForm, manageLists } from "./locators/inventory.ts";
import type { Item, ItemCreate } from "@apc/shared/items";
import { themes, type Mode, type Style } from "@apc/shared/theme";
import { savedItem, serveItems } from "./stubs/items.ts";
import { signIn } from "./stubs/session.ts";
import { testItem } from "@apc/shared/test-items";
import { item } from "./data/items.ts";

// The API answers GET /items with these items, newest first, so the list is the same on every run without a database.
const ITEMS: Item[] = [
  item({ code: "W 712/95", name: "Filtro de óleo", category: "Motor", partBrand: "Mann", vehicleBrand: "Volkswagen", vehicleModel: "Gol", quantity: 8, minQuantity: 2, unitPriceCents: 3990, location: "A-2" }),
  item({ code: "BP-1020", name: "Pastilha de freio", category: "Freios", partBrand: "Cobreq", vehicleBrand: "Chevrolet", vehicleModel: null, position: "D", quantity: 2, minQuantity: 3, unitPriceCents: 123456, location: "B-10" }),
  item({ code: "BA-77", name: "Bomba d'água", category: "Arrefecimento", partBrand: "Urba", vehicleBrand: "Fiat", vehicleModel: "Uno", quantity: 0, minQuantity: 1, unitPriceCents: 13240, location: "C-1" }),
  item({ code: "AM-501", name: "Amortecedor", category: "Suspensão", partBrand: "Cofap", vehicleBrand: "Ford", vehicleModel: "Escort", position: "T", side: "LE", color: "Preto", quantity: 4, minQuantity: 1, unitPriceCents: 24900, location: "A-10" }),
];

/**
 * Answers GET /items with the test items and opens the Inventory tab.
 * @param page The test's page.
 */
async function openInventory(page: Page) {
  await serveItems(page, ITEMS);
  await page.goto("/inventory");
  await expect(inventory(page).table).toBeVisible();
}

// Lists every item with the counter of the total and the stock alerts, the price in reais, "qualquer
// modelo" for an item without a vehicle model, N/A muted with its full name as a tooltip, and the low and
// out-of-stock rows tinted. On a phone, each card shows its code with its part brand, then where it fits, where it is
// and its price, and its stock status under its quantity.
test("Web: the inventory lists every item with its stock alerts", { tag: [TEST_TAGS.inventory, TEST_TAGS.smoke] }, async ({ page, isMobile }) => {
  await openInventory(page);
  const { rows, head } = dataTable(page);
  await expect(inventory(page).count).toHaveText("4 de 4 itens · 1 baixo · 1 esgotado");
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(1)).toHaveAttribute("data-status", "warn");
  await expect(rows.nth(2)).toHaveAttribute("data-status", "danger");
  await expect(rows.nth(0)).not.toHaveAttribute("data-status");
  await expect(rows.nth(2)).toContainText("Esgotado:");

  if (!isMobile) {
    // The sort arrows are left out, as screen readers leave them out.
    const headers = (await page.getByRole("columnheader").allTextContents()).map((header) => header.replace(/[↕↑↓]/g, ""));
    expect(headers).toEqual(["Expandir", "Foto", "Item", "Categoria", "Marca", "Veículo", "Posição", "Lado", "Cor", "Local", "Valor unit.", "Qtd.", "Ações"]);
    await expect(rows.nth(1)).toContainText(/R\$\s1\.234,56/);
    await expect(rows.nth(1)).toContainText("qualquer modelo");
    const position = rows.nth(1).getByTitle("Dianteiro");
    await expect(position).toHaveText("D");
    const sideNotApplicable = rows.nth(1).getByTitle("Lado não se aplica");
    await expect(sideNotApplicable).toHaveText("N/A");
    const muted = await sideNotApplicable.evaluate((el) => getComputedStyle(el).color);
    const text = await position.evaluate((el) => getComputedStyle(el).color);
    expect(muted).not.toBe(text);
  } else {
    await expect(head).toBeHidden();
    await expect(rows.nth(3)).toContainText("AM-501 · Cofap");
    await expect(rows.nth(3)).toContainText(/Ford Escort · A-10 · R\$\s249,00/);
    const { status } = inventory(page);
    await expect(status(rows.nth(0))).toHaveText("un.");
    await expect(status(rows.nth(1))).toHaveText("Baixo");
    await expect(status(rows.nth(2))).toHaveText("Esgotado");
  }
  await expect(page).not.toScrollSideways();
});

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
  await serveItems(page, Array.from({ length: 12 }, (_, index) => item({ code: `P-${index + 1}`, name: `Peça ${index + 1}` })));
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  await expect(rows).toHaveCount(12);
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

/**
 * Measures the Inventory's layout: how far the panel's bottom is from the window's, and whether the page scrolls.
 * @param page The test's page.
 * @returns The gap under the panel, in px, and the page's extra height (0 when it doesn't scroll).
 */
async function layout(page: Page) {
  const panel = (await inventory(page).panel.boundingBox())!;
  const { height, pageExtra } = await page.evaluate(() => ({
    height: window.innerHeight,
    pageExtra: document.scrollingElement!.scrollHeight - window.innerHeight,
  }));
  return { gapBelow: height - (panel.y + panel.height), pageExtra };
}

// Opens the Inventory with a few items, with none and with the API failing, and checks each time the panel reaches the
// bottom of the window (only the frame's margin under it), the pagination shows, and the page doesn't scroll. Each
// state's routes are tried before the ones of the state before it. A phone's page scrolls as a whole instead, above the
// bottom bar.
test("Web: the Inventory panel fills the window and keeps its pagination", { tag: [TEST_TAGS.inventory, TEST_TAGS.layout, TEST_TAGS.desktopOnly] }, async ({ page }) => {
  for (const [state, open] of [
    ["a few items", () => serveItems(page, ITEMS.slice(0, 2))],
    ["no items", () => serveItems(page, [])],
    ["an API error", () => page.route((url) => url.pathname.startsWith("/api/"), (route) => route.fulfill({ status: 500, body: "" }))],
  ] as const) {
    await open();
    await page.goto("/inventory");
    await expect(inventory(page).pager.pages, state).toBeVisible();
    const { gapBelow, pageExtra } = await layout(page);
    expect(gapBelow, state).toBeLessThanOrEqual(16);
    expect(pageExtra, state).toBe(0);
  }
  await expect(page.getByText("0 de 0")).toBeVisible();
});

// Opens the Inventory with 100 items on a page and scrolls the list, and checks only the list scrolls: the page stays
// put, the pagination and the toolbar stay in view, and the table's header row stays pinned on top. A phone's page
// scrolls as a whole instead, above the bottom bar.
test("Web: only the Inventory list scrolls", { tag: [TEST_TAGS.inventory, TEST_TAGS.layout, TEST_TAGS.desktopOnly] }, async ({ page }) => {
  const inv = inventory(page);
  const table = dataTable(page);
  await serveItems(page, Array.from({ length: 100 }, (_, index) => item({ code: `P-${index + 1}`, name: `Peça ${index + 1}` })));
  await page.goto("/inventory");
  await inv.pager.size(100).click();
  await expect(table.rows).toHaveCount(100);
  await page.mouse.move(page.viewportSize()!.width / 2, page.viewportSize()!.height - 160);
  await page.mouse.wheel(0, 2000);
  await expect.poll(() => table.scroll.evaluate((box) => box.scrollTop)).toBeGreaterThan(1000);

  expect((await layout(page)).pageExtra).toBe(0);
  await expect(inv.pager.pages).toBeInViewport();
  await expect(inv.newItem).toBeInViewport();
  const header = (await table.header(/Item/).boundingBox())!;
  const scroll = (await table.scroll.boundingBox())!;
  expect(Math.abs(header.y - scroll.y)).toBeLessThanOrEqual(1);
});

// Searches by part code without separators, by name without accents, and for something that isn't there,
// checking the rows and the counter follow, and that clearing the search brings every item back.
test("Web: the search finds items by name or part code", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  await openInventory(page);
  const inv = inventory(page);
  const { rows } = dataTable(page);

  await inv.search.fill("w712");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Filtro de óleo");
  await expect(inv.count).toHaveText("1 de 4 itens · 1 baixo · 1 esgotado");

  await inv.search.fill("AGUA");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Bomba d'água");

  await inv.search.fill("parafuso");
  await expect(inv.nothingFound).toBeVisible();
  await expect(inv.count).toHaveText("0 de 4 itens · 1 baixo · 1 esgotado");

  await inv.clearSearch.click();
  await expect(rows).toHaveCount(4);
});

// Searches by the second of an item's original codes, written without its separators, and checks the list finds that
// item alone; its row keeps showing its brand's code.
test("Web: an item is found by its second original code", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const shoe = item({ code: "N-1210", name: "Pastilha dianteira", originalCodes: ["5U0 698 151", "5U0 698 151 A"] });
  await serveItems(page, [shoe, ...ITEMS]);
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  await expect(rows).toHaveCount(5);
  await inventory(page).search.fill("5u0698151a");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Pastilha dianteira");
  await expect(rows.first()).toContainText("N-1210");
});

// Adds an item through "Novo item" against an API that keeps what it is sent: saving the blank form names the
// required fields, the filled-in form is posted with the writing rule applied, a toast confirms it and the list
// shows the new item first without a reload; then the item's pencil opens it filled in and an edit is patched. Save is on
// screen without scrolling at both screen sizes.
test("Web: items are added and edited through the item form", { tag: [TEST_TAGS.inventory, TEST_TAGS.smoke] }, async ({ page }) => {
  const stock = [...ITEMS];
  await page.route("**/api/items", async (route) => {
    const saved = savedItem(route.request().postDataJSON());
    stock.unshift(saved);
    return route.fulfill({ status: 201, json: saved });
  });
  await serveItems(page, stock);
  await page.route("**/api/items/*", async (route) => {
    const index = stock.findIndex((it) => route.request().url().endsWith(it.id));
    stock[index] = savedItem(route.request().postDataJSON(), stock[index]);
    return route.fulfill({ json: stock[index] });
  });
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  const form = itemForm(page, "Novo item");
  await inventory(page).newItem.click();
  await expect(form.save).toBeInViewport();
  await form.save.click();
  await expect(form.root.getByText("Informe o código da peça.")).toBeVisible();

  await fillItem(page, "Novo item", { code: "ngk-b7", name: "vela de ignição", category: "motor", partBrand: "Mann", vehicleBrand: "Chevrolet", unitPrice: "34,9" });
  await form.save.click();
  await expect(page.getByText("Item “Vela de ignição” cadastrado.")).toBeVisible();
  await expect(form.root).toBeHidden();
  await expect(rows).toHaveCount(5);
  await expect(rows.first()).toContainText("NGK-B7");

  await inventory(page).edit("Vela de ignição").click();
  const edit = itemForm(page, "Editar item");
  await expect(edit.unitPrice).toHaveValue("R$ 34,90");
  await edit.quantity.fill("9");
  await edit.save.click();
  await expect(page.getByText("Item “Vela de ignição” salvo.")).toBeVisible();
  await expect(rows.first()).toContainText("9");
});

// Types a code another item uses in Novo item, key by key, and checks the field names that item at once, before
// Save, and lets it go once the code is free; written with other separators, it is named again. In Editar item, the
// item's own code passes. Nothing is sent.
test("Web: a part code in use is named while it is typed", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  await serveItems(page, [...ITEMS]);
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") {
      sent.push(`${request.method()} ${request.url()}`);
    }
  });
  await page.goto("/inventory");
  await inventory(page).newItem.click();
  const form = itemForm(page, "Novo item");
  await form.code.pressSequentially("bp-1020");
  await expect(form.root.getByText("Código já usado em “Pastilha de freio”.")).toBeInViewport();
  await form.code.pressSequentially("1");
  await expect(form.root.getByText("Código já usado em “Pastilha de freio”.")).toBeHidden();
  await form.code.fill("bp1020");
  await expect(form.root.getByText("Código já usado em “Pastilha de freio”.")).toBeVisible();
  await form.close.click();

  await inventory(page).edit("Pastilha de freio").click();
  const edit = itemForm(page, "Editar item");
  await edit.code.fill("w 712/95");
  await expect(edit.root.getByText("Código já usado em “Filtro de óleo”.")).toBeVisible();
  await edit.code.fill("bp-1020");
  await expect(edit.root.getByText(/Código já usado/)).toBeHidden();
  expect(sent).toEqual([]);
});

// Creates the names of a new item from the form against an API that keeps what it is sent: a category, part brand,
// vehicle brand and model the lists don't hold each offer "+ Criar" with the name already written by the rule, and
// picking it creates the name, fills it in and says so in a toast, the model under the brand just created. A name
// typed without picking "+ Criar" is refused on save, pointing to it. Once the item is saved, its new category is in
// the Filtros menu without a reload.
test("Web: categories, brands and models are created from the item form", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const stock = [...ITEMS];
  await page.route("**/api/items", async (route) => {
    const saved = savedItem(route.request().postDataJSON());
    stock.unshift(saved);
    return route.fulfill({ status: 201, json: saved });
  });
  await serveItems(page, stock);
  await page.goto("/inventory");
  const option = options(page).named;
  await inventory(page).newItem.click();
  const form = itemForm(page, "Novo item");
  await form.code.fill("t-1");
  await form.name.fill("Turbina");

  await form.category.fill("motor diesel");
  await option("+ Criar categoria “Motor diesel”").click();
  await expect(page.getByText("Categoria “Motor diesel” criada.")).toBeVisible();
  await expect(form.category).toHaveValue("Motor diesel");
  await form.partBrand.fill("NGK");
  await option("+ Criar marca “NGK”").click();
  await expect(page.getByText("Marca de peça “NGK” criada.")).toBeVisible();
  await form.vehicleBrand.fill("renault");
  await expect(form.vehicleModel).toBeDisabled();
  const brandCreated = page.waitForResponse((response) => response.url().endsWith("/api/vehicle-brands") && response.status() === 201);
  await option("+ Criar marca “Renault”").click();
  const renault = await (await brandCreated).json();
  await expect(page.getByText("Marca de veículo “Renault” criada.")).toBeVisible();
  await expect(form.vehicleModel).toBeEnabled();
  await form.vehicleModel.fill("Clio");
  const modelCreated = page.waitForRequest((request) => request.url().endsWith("/api/vehicle-models") && request.method() === "POST");
  await option("+ Criar modelo “Clio”").click();
  expect((await modelCreated).postDataJSON()).toEqual({ name: "Clio", vehicleBrandId: renault.id });
  await expect(page.getByText("Modelo “Clio” criado.")).toBeVisible();
  await form.unitPrice.fill("10");

  await form.category.fill("Turbo");
  await form.save.click();
  await expect(form.root.getByText("Categoria não cadastrada. Escolha “+ Criar categoria” na lista.")).toBeVisible();
  await form.category.fill("motor diesel");
  await form.save.click();
  await expect(page.getByText("Item “Turbina” cadastrado.")).toBeVisible();
  expect(stock[0]).toMatchObject({
    category: "Motor diesel",
    vehicles: [{ vehicleBrand: "Renault", vehicleModel: "Clio" }],
    brands: [{ partBrand: "NGK" }],
  });

  await inventory(page).filters.click();
  await filtersMenu(page).field("Categoria").click();
  await expect(option("Motor diesel")).toBeVisible();
});

// Sorts a list of 30 items through the API: on the second page (on a phone, with the whole list loaded), sorting by
// location goes back to the first 25 with the locations in natural order (A-2 before A-10); the same column again
// reverses it; and the unit price sorts by value, ties in part code order. The desktop sorts with the column headers,
// the phone with the "Ordenar" select.
test("Web: the inventory list sorts by a column", { tag: [TEST_TAGS.inventory] }, async ({ page, isMobile }) => {
  const stock = Array.from({ length: 30 }, (_, index) =>
    item({ code: `P-${index + 1}`, name: `Peça ${index + 1}`, location: `A-${index + 1}`, unitPriceCents: ((index % 7) + 1) * 100 }),
  );
  const queries: string[] = [];
  await serveItems(page, stock, (query) => query.has("pageSize") && queries.push(query.toString()));
  await page.goto("/inventory");
  const table = dataTable(page);
  const { rows } = table;
  const desktop = !isMobile;
  /** Sorts by a column, with its header on the desktop and with the "Ordenar" select on the phone. */
  const sortBy = async (header: string, option: string) => {
    if (desktop) {
      await table.header(header).getByRole("button").click();
    } else {
      await table.sort.click();
      await options(page).named(option).click();
    }
  };
  if (desktop) {
    await inventory(page).pager.page(2).click();
    await expect(rows).toHaveCount(5);
  } else {
    await expect(rows).toHaveCount(25);
    await rows.last().scrollIntoViewIfNeeded();
    await expect(rows).toHaveCount(30);
  }

  await sortBy("Local", "Local (A → Z)");
  await expect(rows).toHaveCount(25);
  await expect(rows.nth(0)).toContainText("A-1");
  await expect(rows.nth(1)).toContainText("A-2");
  expect(queries.at(-1)).toBe("page=1&pageSize=25&sort=location&order=asc");
  if (desktop) {
    await expect(table.header("Local")).toHaveAttribute("aria-sort", "ascending");
  }

  await sortBy("Local", "Local (Z → A)");
  await expect(rows.nth(0)).toContainText("A-30");
  expect(queries.at(-1)).toBe("page=1&pageSize=25&sort=location&order=desc");

  await sortBy("Valor unit.", "Valor unitário (menor → maior)");
  if (desktop) {
    await sortBy("Valor unit.", "");
  } else {
    await sortBy("", "Valor unitário (maior → menor)");
  }
  await expect(rows.nth(0)).toContainText("P-7");
  await expect(rows.nth(0)).toContainText(/R\$\s7,00/);
  await expect(rows.nth(1)).toContainText("P-14");
  expect(queries.at(-1)).toBe("page=1&pageSize=25&sort=price&order=desc");
});

// Imports a spreadsheet through "Importar CSV" against an API that keeps what it is sent: the template downloads,
// the file chosen is previewed with the names to create and the row with an error marked, and importing saves the
// valid rows only: a new item, and an update of the item whose part code is in use. A toast says so and the list
// shows them without a reload.
test("Web: items are imported from a CSV file", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const stock = [...ITEMS];
  const imported: string[] = [];
  await page.route("**/api/items/import", async (route) => {
    const result = { created: 0, updated: 0 };
    for (const sent of route.request().postDataJSON().items as ItemCreate[]) {
      const codes = sent.brands.map((brand) => brand.code);
      imported.push(...codes);
      const index = stock.findIndex((held) => held.brands.some((brand) => codes.includes(brand.code)));
      if (index >= 0) {
        stock[index] = savedItem({ ...sent, brands: sent.brands.map((brand) => ({ ...brand, id: stock[index].brands[0].id })) }, stock[index]);
        result.updated++;
      } else {
        stock.unshift(savedItem(sent));
        result.created++;
      }
    }
    return route.fulfill({ json: result });
  });
  await serveItems(page, stock);
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  await expect(rows).toHaveCount(4);

  await inventory(page).importCsv.click();
  const importer = importDialog(page);
  const download = page.waitForEvent("download");
  await importer.template.click();
  expect((await download).suggestedFilename()).toBe("modelo-estoque.csv");

  const file = [
    "code;name;category;part_brand;vehicle_brand;vehicle_model;quantity;minimum;location;unit_price;color;position;side",
    "w 712/95;filtro de óleo;motor;Mann;volkswagen;gol;20;2;A-2;42,50;;;",
    "ngk-b7;vela de ignição;Ignição;NGK;Fiat;Uno;10;3;B-1;34.9;;;",
    ";sem código;Freios;Cobreq;Ford;;1;;;0;;;",
  ].join("\n");
  await importer.file.setInputFiles({ name: "estoque.csv", mimeType: "text/csv", buffer: Buffer.from(file) });
  await expect(importer.root.getByText("estoque.csv · 2 itens prontos para importar · 1 linha com erro")).toBeVisible();
  await expect(importer.root.getByText("Categorias: Ignição")).toBeVisible();
  await expect(importer.root.getByText("Marcas de peça: NGK")).toBeVisible();
  await expect(importer.rows.filter({ hasText: "Informe o código da peça." })).toHaveAttribute("data-invalid", "true");
  const submit = importer.submit(2);
  await expect(submit).toBeInViewport();
  await submit.click();

  await expect(page.getByText("Importação concluída: 1 item criado, 1 atualizado.")).toBeVisible();
  await expect(importer.root).toBeHidden();
  expect(imported).toEqual(["W 712/95", "NGK-B7"]);
  await expect(rows).toHaveCount(5);
  await expect(rows.first()).toContainText("Vela de ignição");
  await expect(rows.filter({ hasText: "Filtro de óleo" })).toContainText("20");
});

// Runs the Inventory tutorial against an API that keeps what it is sent. It starts by itself the first time; each
// step points at its target, moves on when the user does it, and "Fazer por mim" does it for them. Part 1 creates
// the test item, part 2 finds it with the search and the filters, and part 3 opens its details, edits it to a low and
// then an out-of-stock row, and deletes it. Closing the form mid-step goes back to the step that opens it. At the end
// the search and the filters are off and the test item is gone; the user menu replays the tutorial, and Skip ends it.
test("Web: the Inventory tutorial creates, finds, edits and deletes a test item", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  await signIn(page, false);
  const stock = [...ITEMS];
  await page.route("**/api/items", async (route) => {
    const saved = savedItem(route.request().postDataJSON());
    stock.unshift(saved);
    return route.fulfill({ status: 201, json: saved });
  });
  await serveItems(page, stock);
  await page.route("**/api/items/*", async (route) => {
    const index = stock.findIndex((held) => route.request().url().endsWith(held.id));
    if (route.request().method() === "DELETE") {
      stock.splice(index, 1);
      return route.fulfill({ status: 204 });
    }
    stock[index] = savedItem(route.request().postDataJSON(), stock[index]);
    return route.fulfill({ json: stock[index] });
  });
  await page.goto("/inventory");
  const inv = inventory(page);
  const guide = tour(page);
  const step = (title: string) => expect(guide.step(title)).toBeVisible();
  const doIt = () => guide.doIt.click();
  const { rows } = dataTable(page);
  const testRow = rows.filter({ hasText: "TUTORIAL-001" });

  await step("Abra o cadastro");
  await expect(guide.card).toContainText("Parte 1 de 3 · Cadastrar um item");
  await expect(guide.spotlight).toBeVisible();
  await inv.newItem.first().click();
  await step("Diga que peça é");
  await itemForm(page, "Novo item").cancel.click();
  await step("Abra o cadastro");
  await doIt();
  await step("Diga que peça é");
  await doIt();
  await step("Diga onde e quantas");
  await expect(itemForm(page, "Novo item").code).toHaveValue("TUTORIAL-001");
  await doIt();
  await step("Salve o item");
  await doIt();

  await step("Procure pelo nome");
  await expect(testRow).toHaveCount(1);
  await inv.search.fill("tutorial");
  await step("Abra os filtros");
  await inv.filters.click();
  await step("Filtre o estoque");
  await doIt();
  await step("Achou");
  await expect(rows).toHaveCount(1);
  await guide.next.click();

  await step("Abra o item");
  await testRow.click();
  await step("Libere a edição");
  await itemDetails(page).edit.click();
  await step("Mude o nome e a quantidade");
  await doIt();
  await step("Salve as alterações");
  await doIt();
  await step("Estoque baixo");
  await expect(testRow).toHaveAttribute("data-status", "warn");
  await guide.next.click();
  await step("Edite pelo lápis");
  await inv.edit("Item de teste do tutorial editado").click();
  await step("Zere a quantidade");
  await doIt();
  await step("Esgotado");
  await expect(testRow).toHaveAttribute("data-status", "danger");
  await guide.next.click();
  await step("Exclua o item");
  await inv.remove("Item de teste do tutorial editado").click();
  await step("Confirme");
  await deleteDialog(page).confirm.click();
  await step("Pronto!");
  await guide.done.click();

  await expect(guide.card).toBeHidden();
  await expect(rows).toHaveCount(4);
  await expect(inv.search).toHaveValue("");
  await expect(inv.filters).toBeVisible();
  await expect(inv.filters).toHaveAccessibleName("Filtros");
  expect(stock.some((held) => held.brands.some((brand) => brand.code === "TUTORIAL-001"))).toBe(false);

  await userMenu(page).trigger.click();
  await userMenu(page).item("Tutorial do estoque").click();
  await step("Abra o cadastro");
  await guide.skip.click();
  await expect(guide.card).toBeHidden();
});

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
  const confirm = dialog(page, "Excluir “Arrefecimento”?").root.getByRole("button", { name: "Excluir" });
  await expect(confirm).toBeInViewport();
  await confirm.click();
  await expect(page.getByText("Categoria “Arrefecimento” excluída.")).toBeVisible();
  await expect(lists.remove("Categorias", "Arrefecimento")).toBeHidden();

  await lists.rename("Categorias", "Suspensão").click();
  await lists.newName("Suspensão").fill("suspensão e direção");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Categoria renomeada para “Suspensão e direção”.")).toBeVisible();
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
  const confirm = dialog(page, "Juntar “Freios” com “Motor”?").root;
  await expect(confirm).toContainText("O item de “Freios” passa para “Motor”");
  await confirm.getByRole("button", { name: "Juntar" }).click();
  await expect(page.getByText("Categoria “Freios” juntada a “Motor”: 1 item mudou.")).toBeVisible();
  await expect(lists.rename("Categorias", "Freios")).toBeHidden();
  await lists.closeText.click();
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "Pastilha de freio" })).toContainText("Motor");
  await expect(inv.filters).toHaveAccessibleName("Filtros, 1 ativo");
});

// Deletes an item against an API that keeps what it is sent: the row's trash opens a confirmation naming the item
// and its code, Cancel and Escape leave the list as it was, and Excluir deletes it by its id, a toast confirms it
// and the list loses the row without a reload. Excluir is on screen without scrolling at both screen sizes.
test("Web: an item is deleted after confirming", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const stock = [...ITEMS];
  const deleted: string[] = [];
  await serveItems(page, stock);
  await page.route("**/api/items/*", async (route) => {
    const index = stock.findIndex((it) => route.request().url().endsWith(it.id));
    deleted.push(`${route.request().method()} ${stock[index].id}`);
    stock.splice(index, 1);
    return route.fulfill({ status: 204 });
  });
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  await expect(rows).toHaveCount(4);

  const trash = inventory(page).remove("Bomba d'água");
  const confirmation = deleteDialog(page);
  await trash.click();
  await expect(confirmation.root).toContainText("Bomba d'água (BA-77) sai do estoque. Essa ação não pode ser desfeita.");
  await expect(confirmation.confirm).toBeInViewport();
  await confirmation.cancel.click();
  await expect(confirmation.root).toBeHidden();
  await trash.click();
  await page.keyboard.press("Escape");
  await expect(confirmation.root).toBeHidden();
  await expect(rows).toHaveCount(4);
  expect(deleted).toEqual([]);

  const id = ITEMS[2].id;
  await trash.click();
  await confirmation.confirm.click();
  await expect(page.getByText("Item “Bomba d'água” excluído.")).toBeVisible();
  await expect(confirmation.root).toBeHidden();
  await expect(rows).toHaveCount(3);
  await expect(inventory(page).count).toHaveText("3 de 3 itens · 1 baixo · 0 esgotados");
  expect(deleted).toEqual([`DELETE ${id}`]);
});

// Opens an item's details from its row against an API that keeps what it is sent: the details show the item as
// text, Editar unlocks the fields in place and Salvar alterações patches the item. The pencil still opens the edit
// form and Enter on a focused row opens the details; the user menu has no choice to turn this off.
test("Web: a row opens the item details, editable after Editar", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const stock = [...ITEMS];
  await serveItems(page, stock);
  await page.route("**/api/items/*", async (route) => {
    const index = stock.findIndex((it) => route.request().url().endsWith(it.id));
    stock[index] = savedItem(route.request().postDataJSON(), stock[index]);
    return route.fulfill({ json: stock[index] });
  });
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  const details = itemDetails(page);
  const edit = itemForm(page, "Editar item");

  await rows.nth(3).getByText("Amortecedor").click();
  await expect(details.field("Lado")).toContainText("Lado esquerdo");
  await expect(details.field("Local")).toContainText("A-10");
  await expect(details.root.getByRole("textbox")).toHaveCount(0);
  await details.edit.click();
  await expect(edit.name).toBeFocused();
  await edit.location.fill("A-11");
  await expect(edit.save).toHaveAccessibleName("Salvar alterações");
  await expect(edit.save).toBeInViewport();
  await edit.save.click();
  await expect(page.getByText("Item “Amortecedor” salvo.")).toBeVisible();
  await expect(edit.root).toBeHidden();
  expect(stock[3].brands[0].location).toBe("A-11");

  await inventory(page).edit("Filtro de óleo").click();
  await expect(edit.root).toBeVisible();
  await page.keyboard.press("Escape");
  await rows.first().focus();
  await page.keyboard.press("Enter");
  await expect(details.root).toBeVisible();
  await details.closeText.click();

  await userMenu(page).trigger.click();
  await expect(userMenu(page).checkbox(/Abrir item ao clicar na linha/)).toHaveCount(0);
});

// Duplicates an item of two photos from its details against an API that keeps what it is sent: Copiar dados e fotos
// opens a new item's form filled in without the code and with the quantity at 0, and saving it with a code of its own
// posts the item, then sends the photos as copies of the first item's, which become photos of the copy's own. Deleting
// the first item leaves the copy's photos; duplicating the copy with Copiar só os dados gives an item without photos.
test("Web: an item is duplicated from its details, with or without its photos", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  const photos = ["frente", "lado"].map((name) => ({ id: crypto.randomUUID(), url: `/photos/${name}.png`, thumbUrl: `/photos/${name}-thumb.webp` }));
  const stock = ITEMS.map((it, index) => (index === 0 ? { ...it, brands: [{ ...it.brands[0], photos }] } : it));
  const sent: string[][] = [];
  await page.route("**/api/photos/*", (route) => route.fulfill({ body: png, contentType: "image/png" }));
  await serveItems(page, stock);
  await page.route("**/api/items", (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback();
    }
    stock.unshift(savedItem(route.request().postDataJSON()));
    return route.fulfill({ status: 201, json: stock[0] });
  });
  await page.route("**/api/items/*", (route) => {
    stock.splice(stock.findIndex((it) => route.request().url().endsWith(it.id)), 1);
    return route.fulfill({ status: 204 });
  });
  await page.route("**/api/items/*/brands/*/photos", (route) => {
    const index = stock.findIndex((it) => route.request().url().includes(`/items/${it.id}/brands/`));
    const body = route.request().postDataBuffer()!.toString("latin1");
    const copies = [...body.matchAll(/name="copy"\r\n\r\n([^\r]*)/g)].map(([, id]) => id);
    sent.push(copies.map((id) => `copy ${id}`));
    const copied = copies.map((_, position) => ({ id: crypto.randomUUID(), url: `/photos/copy-${position}.png`, thumbUrl: `/photos/copy-${position}-thumb.webp` }));
    stock[index] = { ...stock[index], brands: [{ ...stock[index].brands[0], photos: copied }] };
    return route.fulfill({ json: stock[index] });
  });
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  const details = itemDetails(page);
  const question = dialog(page, "Duplicar item?").root;
  const form = itemForm(page, "Novo item");

  await rows.first().getByText("Filtro de óleo").click();
  await details.duplicate.click();
  const withPhotos = question.getByRole("button", { name: "Copiar dados e fotos" });
  await expect(withPhotos).toBeInViewport();
  await withPhotos.click();
  await expect(details.root).toBeHidden();
  await expect(form.name).toHaveValue("Filtro de óleo");
  await expect(form.code).toHaveValue("");
  await expect(form.quantity).toHaveValue("0");
  await expect(form.photos).toHaveCount(2);
  await form.code.fill("W 712/96");
  await form.save.click();
  await expect(page.getByText("Item “Filtro de óleo” cadastrado.")).toBeVisible();
  expect(sent).toEqual([photos.map((photo) => `copy ${photo.id}`)]);
  await expect(rows).toHaveCount(5);
  const copy = stock[0];
  expect([copy.brands[0].code, copy.quantity, copy.brands[0].photos.some((photo) => photos.some((each) => each.id === photo.id))]).toEqual(["W 712/96", 0, false]);

  // Both items are named "Filtro de óleo": the first item's trash is the second row's.
  await rows.nth(1).getByRole("button", { name: "Excluir Filtro de óleo" }).click();
  await deleteDialog(page).confirm.click();
  await expect(rows).toHaveCount(4);
  await expect(thumbnailImage(inventory(page).photos("Filtro de óleo"))).toHaveAttribute("src", "/api/photos/copy-0-thumb.webp");

  await rows.first().getByText("Filtro de óleo").click();
  await details.duplicate.click();
  await question.getByRole("button", { name: "Copiar só os dados" }).click();
  await expect(form.photos).toHaveCount(0);
  await form.code.fill("W 712/97");
  await form.save.click();
  await expect(rows).toHaveCount(5);
  expect([stock[0].brands[0].code, stock[0].brands[0].photos]).toEqual(["W 712/97", []]);
  expect(sent).toHaveLength(1);
});

// Closes Novo item, Editar item, Detalhes do item and Gerenciar listas with the round × at the top right of each,
// on screen without scrolling at both screen sizes, and checks nothing was sent.
test("Web: the item form and Manage lists close on the ×", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  await serveItems(page, [...ITEMS]);
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") {
      sent.push(`${request.method()} ${request.url()}`);
    }
  });
  await page.goto("/inventory");
  const inv = inventory(page);
  const { rows } = dataTable(page);
  const openers = [
    { open: () => inv.newItem.click(), name: "Novo item" },
    { open: () => inv.edit("Filtro de óleo").click(), name: "Editar item" },
    { open: () => rows.first().getByText("Filtro de óleo").click(), name: "Detalhes do item" },
    { open: () => inv.manageLists.click(), name: "Gerenciar listas" },
  ];
  for (const { open, name } of openers) {
    await open();
    const { root, close } = dialog(page, name);
    await expect(close).toBeInViewport();
    await close.click();
    await expect(root).toBeHidden();
  }
  expect(sent).toEqual([]);
});

// Works with an item's photos against an API that keeps what it is sent: the row shows the cover's thumbnail, which
// opens the photos large; "Adicionar foto" sends the kept photo and the new file, in order, and the viewer and the
// list follow; removing the cover sends what is left. Then a photo added in the edit form is sent after the item.
test("Web: item photos are added and removed from the list and the form", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  const cover = { id: crypto.randomUUID(), url: "/photos/cover.png", thumbUrl: "/photos/cover-thumb.webp" };
  const stock = ITEMS.map((it, index) => (index === 0 ? { ...it, brands: [{ ...it.brands[0], photos: [cover] }] } : it));
  const sent: string[][] = [];
  await page.route("**/api/photos/*", (route) => route.fulfill({ body: png, contentType: "image/png" }));
  await serveItems(page, stock);
  await page.route("**/api/items/*", (route) => {
    const index = stock.findIndex((it) => route.request().url().endsWith(it.id));
    stock[index] = savedItem(route.request().postDataJSON(), stock[index]);
    return route.fulfill({ json: stock[index] });
  });
  await page.route("**/api/items/*/brands/*/photos", (route) => {
    const index = stock.findIndex((it) => route.request().url().includes(`/items/${it.id}/brands/`));
    const body = route.request().postDataBuffer()!.toString("latin1");
    const parts = [...body.matchAll(/name="(keep|photo)"(?:; filename="([^"]+)")?[^\r]*\r\n(?:Content-Type[^\r]*\r\n)?\r\n([^\r]*)/g)];
    sent.push(parts.map(([, name, file, value]) => (name === "keep" ? `keep ${value}` : `photo ${file}`)));
    const photos = parts.map(([, name, , value], position) =>
      name === "keep"
        ? stock[index].brands[0].photos.find((photo) => photo.id === value)!
        : { id: crypto.randomUUID(), url: `/photos/new-${position}.png`, thumbUrl: `/photos/new-${position}-thumb.webp` },
    );
    stock[index] = { ...stock[index], brands: [{ ...stock[index].brands[0], photos }, ...stock[index].brands.slice(1)] };
    return route.fulfill({ json: stock[index] });
  });
  await page.goto("/inventory");
  const inv = inventory(page);

  const thumbnail = inv.photos("Filtro de óleo");
  await expect(thumbnailImage(thumbnail)).toHaveAttribute("src", "/api/photos/cover-thumb.webp");
  await thumbnail.click();
  const viewer = dialog(page, "Filtro de óleo");
  await expect(viewer.root.getByRole("img")).toHaveAttribute("src", "/api/photos/cover.png");
  await viewer.root.getByTestId("common.image-viewer.body.input").setInputFiles({ name: "lado.png", mimeType: "image/png", buffer: png });
  await expect(viewer.root.getByText("Foto adicionada")).toBeVisible();
  expect(sent).toEqual([[`keep ${cover.id}`, "photo lado.png"]]);
  await expect(viewer.root.getByRole("button", { name: /^Foto \d$/ })).toHaveCount(2);

  await viewer.root.getByRole("button", { name: "Foto 1" }).click();
  await viewer.root.getByRole("button", { name: "Remover esta foto" }).click();
  await dialog(page, "Remover esta foto?").root.getByRole("button", { name: "Remover" }).click();
  await expect(viewer.root.getByText("Foto removida")).toBeVisible();
  expect(sent[1]).toEqual([`keep ${stock[0].brands[0].photos[0].id}`]);
  await viewer.close.click();
  await expect(thumbnailImage(thumbnail)).toHaveAttribute("src", "/api/photos/new-1-thumb.webp");

  await inv.edit("Pastilha de freio").click();
  const edit = itemForm(page, "Editar item");
  await edit.photoFile.setInputFiles({ name: "frente.png", mimeType: "image/png", buffer: png });
  await edit.save.click();
  await expect(page.getByText("Item “Pastilha de freio” salvo.")).toBeVisible();
  expect(sent[2]).toEqual(["photo frente.png"]);
  await expect(thumbnailImage(inv.photos("Pastilha de freio"))).toHaveAttribute("src", "/api/photos/new-0-thumb.webp");
});

// Filters the list against an API that filters what it is asked for: two categories in the Filtros menu go out as the
// list query only on Aplicar and leave their rows, with the button counting one filter; the stock status chips go
// one at a time; a vehicle brand narrows the vehicle models, each named with its brand; the position chips carry
// their full names; and "Limpar filtros" brings every item back with an empty query.
test("Web: the filters narrow the list through the API query", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  // The queries of the list's page; the request for every item, with no query, is left out.
  const queries: string[] = [];
  await serveItems(page, ITEMS, (query) => query.has("pageSize") && queries.push(query.toString()));
  await page.goto("/inventory");
  const inv = inventory(page);
  const { rows } = dataTable(page);
  const option = options(page);
  await expect(rows).toHaveCount(4);

  await inv.filters.click();
  const menu = filtersMenu(page);
  await menu.field("Categoria").click();
  await option.named("Motor").click();
  await option.named("Suspensão").click();
  await page.keyboard.press("Escape");
  await expect(menu.chip("N/A").first()).toHaveAttribute("title", "Posição não se aplica");
  expect(queries.at(-1)).toBe("page=1&pageSize=25");
  await menu.apply.click();
  await expect(rows).toHaveCount(2);
  expect(queries.at(-1)).toBe("category=Motor&category=Suspens%C3%A3o&page=1&pageSize=25");
  await expect(inv.filters).toHaveAccessibleName("Filtros, 1 ativo");
  await expect(inv.count).toHaveText("2 de 4 itens · 1 baixo · 1 esgotado");

  await inv.lowStock.click();
  await expect(inv.nothingFound).toBeVisible();
  expect(queries.at(-1)).toContain("status=low");
  await inv.outOfStock.click();
  await expect(inv.outOfStock).toHaveAttribute("aria-pressed", "true");
  await expect(inv.lowStock).toHaveAttribute("aria-pressed", "false");
  await inv.outOfStock.click();
  await expect(rows).toHaveCount(2);

  await inv.filters.click();
  await menu.field("Marca do veículo").click();
  await option.named("Ford").click();
  await page.keyboard.press("Escape");
  await menu.field("Modelo do veículo").click();
  await expect(option.all).toHaveText(["Todos", "Escort · Ford"]);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await inv.clearFilters.click();
  await expect(rows).toHaveCount(4);
  await expect(inv.filters).toHaveAccessibleName("Filtros");
  await expect(inv.clearFilters).toHaveCount(0);
});

// Presses each stock status chip on its own: "Estoque baixo" lists only the item under its minimum and "Esgotado"
// only the one with none left, the counter saying how many of the stock match; pressing it again lists every item.
test("Web: each stock status chip lists only its items", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  await openInventory(page);
  const inv = inventory(page);
  const { rows } = dataTable(page);

  await inv.lowStock.click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Pastilha de freio");
  await expect(inv.count).toHaveText("1 de 4 itens · 1 baixo · 1 esgotado");

  await inv.outOfStock.click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Bomba d'água");
  await expect(inv.count).toHaveText("1 de 4 itens · 1 baixo · 1 esgotado");

  await inv.outOfStock.click();
  await expect(rows).toHaveCount(4);
  await expect(inv.clearFilters).toHaveCount(0);
});

// Follows the list's feedback: skeleton rows while the API takes its time, then the error state when it fails, whose
// "Tentar de novo" loads the list once the API answers; a search that finds nothing offers "Limpar filtros", which
// brings every item back; and an empty stock offers "Novo item", which opens the form.
test("Web: the inventory shows loading, error and empty states", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  let answer: "slow" | "fail" | "items" = "slow";
  let release = () => {};
  const stock = [...ITEMS];
  await serveItems(page, stock);
  await page.route(
    (url) => url.pathname === "/api/items",
    async (route) => {
      if (answer === "slow") {
        await new Promise<void>((resolve) => (release = resolve));
        return route.fulfill({ status: 500 });
      }
      return answer === "fail" ? route.fulfill({ status: 500 }) : route.fallback();
    },
  );
  await page.goto("/inventory");
  const inv = inventory(page);
  const { rows } = dataTable(page);
  await expect(inv.loadingRows).toHaveCount(5);
  await expect(inv.loading).toBeAttached();

  answer = "fail";
  release();
  await expect(inv.failed).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  answer = "items";
  await inv.failed.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(rows).toHaveCount(4);

  await inv.search.fill("parafuso");
  await expect(inv.nothingFound).toBeVisible();
  await inv.clearFilters.last().click();
  await expect(rows).toHaveCount(4);
  await expect(inv.search).toHaveValue("");

  stock.splice(0);
  await page.reload();
  await expect(inv.empty).toBeVisible();
  await inv.newItem.last().click();
  await expect(itemForm(page, "Novo item").root).toBeVisible();
});

// Pages through 60 items, newest first, against an API that pages what it is asked for: 25 per page by default, with
// the range shown; page 2 asks for page 2; 50 per page keeps the first item that was showing on screen; a search goes
// back to page 1; the user menu's "Itens por página" applies to the list at once; deleting the last item of the last
// page goes to the page before; and a new item shows first on page 1. A phone loads more as it scrolls instead (see
// the test after this one).
test("Web: the inventory list shows one page at a time", { tag: [TEST_TAGS.inventory, TEST_TAGS.desktopOnly] }, async ({ page }) => {
  const stock = Array.from({ length: 51 }, (_, index) =>
    item({ code: `P-${String(index + 1).padStart(3, "0")}`, name: `Peça ${index + 1}`, quantity: 5 }),
  );
  const queries: string[] = [];
  await page.route("**/api/items", async (route) => {
    const saved = savedItem(route.request().postDataJSON());
    stock.unshift(saved);
    return route.fulfill({ status: 201, json: saved });
  });
  await page.route("**/api/items/*", async (route) => {
    stock.splice(stock.findIndex((it) => route.request().url().endsWith(it.id)), 1);
    return route.fulfill({ status: 204 });
  });
  await serveItems(page, stock, (query) => query.has("pageSize") && queries.push(query.toString()));
  await page.goto("/inventory");
  const inv = inventory(page);
  const { rows } = dataTable(page);
  await expect(rows).toHaveCount(25);
  await expect(page.getByText("1–25 de 51")).toBeVisible();
  expect(queries.at(-1)).toBe("page=1&pageSize=25");

  await inv.pager.page(2).click();
  await expect(rows.first()).toContainText("P-026");
  expect(queries.at(-1)).toBe("page=2&pageSize=25");
  await inv.pager.size(50).click();
  await expect(rows).toHaveCount(50);
  await expect(page.getByText("1–50 de 51")).toBeVisible();
  await expect(rows.nth(25)).toContainText("P-026");

  await inv.pager.page(2).click();
  await expect(rows).toHaveCount(1);
  await inv.search.fill("Peça 1");
  await expect(page.getByText(/^1–\d+ de \d+$/)).toBeVisible();
  expect(queries.at(-1)).toBe("q=Pe%C3%A7a+1&page=1&pageSize=50");
  await inv.clearSearch.click();

  await userMenu(page).trigger.click();
  await userMenu(page).radio("100").click();
  await page.keyboard.press("Escape");
  await expect(rows).toHaveCount(51);
  await expect(inv.pager.size(100)).toHaveAttribute("aria-checked", "true");
  await inv.pager.size(25).click();
  await inv.pager.page(3).click();
  await expect(rows).toHaveCount(1);
  await deleteItem(page, "Peça 51");
  await expect(page.getByText("26–50 de 50")).toBeVisible();

  await inv.newItem.first().click();
  await fillItem(page, "Novo item", { code: "nova-1", name: "peça nova", category: "Motor", partBrand: "Bosch", vehicleBrand: "Volkswagen", unitPrice: "10" });
  await itemForm(page, "Novo item").save.click();
  await expect(page.getByText("1–25 de 51")).toBeVisible();
  await expect(rows.first()).toContainText("NOVA-1");
});

// On a phone, lists 51 items and checks the first 25 show with no pagination; scrolling to the end asks the API for the
// next 25, then the last one, and "Fim da lista" ends the list. Opening an item near the end and closing it leaves the
// list where it was; a search starts it over from the first 25.
test("Web: on a phone the list loads more as it scrolls and keeps its place", { tag: [TEST_TAGS.inventory, TEST_TAGS.mobileOnly] }, async ({ page }) => {
  const stock = Array.from({ length: 51 }, (_, index) =>
    item({ code: `P-${String(index + 1).padStart(3, "0")}`, name: `Peça ${index + 1}`, quantity: 5 }),
  );
  const queries: string[] = [];
  await serveItems(page, stock, (query) => query.has("pageSize") && queries.push(query.toString()));
  await page.goto("/inventory");
  const inv = inventory(page);
  const { rows } = dataTable(page);
  await expect(rows).toHaveCount(25);
  await expect(inv.pager.pages).toHaveCount(0);
  await expect(inv.listEnd).toBeHidden();
  expect(queries.at(-1)).toBe("page=1&pageSize=25");

  await rows.last().scrollIntoViewIfNeeded();
  await expect(rows).toHaveCount(50);
  expect(queries.at(-1)).toBe("page=2&pageSize=25");
  await expect(inv.listEnd).toBeHidden();
  await rows.last().scrollIntoViewIfNeeded();
  await expect(rows).toHaveCount(51);
  expect(queries.at(-1)).toBe("page=3&pageSize=25");
  await expect(inv.listEnd).toBeVisible();
  await expect(rows.last()).toContainText("P-051");

  const before = await page.evaluate(() => window.scrollY);
  await rows.last().getByText("Peça 51").click();
  await expect(itemDetails(page).root).toBeVisible();
  await itemDetails(page).closeText.click();
  await expect(itemDetails(page).root).toBeHidden();
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  await expect(rows).toHaveCount(51);

  await inv.search.fill("Peça");
  await expect(rows).toHaveCount(25);
  expect(queries.at(-1)).toBe("q=Pe%C3%A7a&page=1&pageSize=25");
});

// On a 1360×768 notebook, in full screen and in a window (1360×689 once the taskbar and the title bar are taken off),
// opens the Inventory with 100 items and checks the page doesn't scroll: the header at the top, the toolbar and the
// pagination in view, nothing sideways, and only the table scrolls.
test("Web: on a 1360×768 notebook only the Inventory's table scrolls", { tag: [TEST_TAGS.inventory, TEST_TAGS.layout, TEST_TAGS.desktopOnly] }, async ({ page }) => {
  await serveItems(page, Array.from({ length: 100 }, (_, index) => item({ code: `P-${index + 1}`, name: `Peça ${index + 1}` })));
  await page.goto("/inventory");
  const inv = inventory(page);
  const table = dataTable(page);
  await inv.pager.size(100).click();
  await expect(table.rows).toHaveCount(100);
  await atNotebookSizes(page, async (size) => {
    expect((await layout(page)).pageExtra, size).toBe(0);
    expect((await dashboard(page).header.boundingBox())!.y, size).toBe(0);
    await expect(inv.newItem, size).toBeInViewport();
    await expect(inv.pager.pages, size).toBeInViewport();
    expect(await table.scroll.evaluate((box) => box.scrollHeight > box.clientHeight), size).toBe(true);
    await expect(page, size).not.toScrollSideways();
  });
});

// Lists an item of two brands and checks its row shows both codes, the quantity added up, "2 marcas" and a chevron
// in the accent at its left; a click anywhere on it opens a row for each brand under it, with the brand's part brand,
// code and quantity, no tint and no actions, and a click on the second brand opens the item's details on that brand.
// A click on the item closes the brands' rows again, and Enter on it opens them. A phone's card opens the details
// instead (see the test after this one).
test("Web: an item of several brands opens a row for each brand", { tag: [TEST_TAGS.inventory, TEST_TAGS.desktopOnly] }, async ({ page }) => {
  const pads = testItem({
    name: "Pastilha dianteira",
    minQuantity: 4,
    brands: [
      { ...item({ code: "N-1210", name: "" }).brands[0], partBrand: "Cobreq", quantity: 1 },
      { ...item({ code: "PD/1210", name: "" }).brands[0], partBrand: "Fras-le", quantity: 2 },
    ],
  });
  await serveItems(page, [pads]);
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0)).toContainText("N-1210 +1");
  await expect(rows.nth(0)).toHaveAttribute("data-status", "warn");
  await expect(rows.nth(0)).toContainText("2 marcas");
  await expect(rows.nth(0)).toHaveAttribute("aria-expanded", "false");
  const [style, mode] = await page.evaluate(() => [document.documentElement.dataset.style, document.documentElement.dataset.mode]);
  await expect(rows.nth(0).getByTestId("inventory.inventory-tab.chevron")).toHaveCSS("color", rgb(themes[style as Style][mode as Mode].colors.accent));

  await rows.nth(0).getByText("Pastilha dianteira").click();
  await expect(rows.nth(0)).toHaveAttribute("aria-expanded", "true");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1)).toContainText("Cobreq");
  await expect(rows.nth(1)).toContainText("N-1210");
  await expect(rows.nth(2)).toContainText("Fras-le");
  await expect(rows.nth(2)).toContainText("PD/1210");
  for (const nested of [rows.nth(1), rows.nth(2)]) {
    await expect(nested).not.toHaveAttribute("data-status");
    await expect(nested.getByRole("button", { name: /^Editar / })).toHaveCount(0);
  }
  await expect(rows.nth(0).getByRole("button", { name: "Editar Pastilha dianteira" })).toBeVisible();

  await rows.nth(2).getByText("PD/1210").click();
  const details = itemDetails(page);
  await expect(details.field("Marca 2")).toBeInViewport();
  await details.closeText.click();

  await rows.nth(0).getByText("N-1210 +1").click();
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0)).toHaveAttribute("aria-expanded", "false");
  await rows.nth(0).focus();
  await page.keyboard.press("Enter");
  await expect(rows).toHaveCount(3);
});

// On a phone, lists an item of two brands and checks its card shows its first code with "2 marcas", the quantity
// added up with "Baixo" under it, and opens nothing under it: a tap opens the item's details.
test("Web: on a phone a card of several brands opens the item's details", { tag: [TEST_TAGS.inventory, TEST_TAGS.mobileOnly] }, async ({ page }) => {
  const pads = testItem({
    name: "Pastilha dianteira",
    minQuantity: 4,
    brands: [
      { ...item({ code: "N-1210", name: "" }).brands[0], partBrand: "Cobreq", quantity: 1 },
      { ...item({ code: "PD/1210", name: "" }).brands[0], partBrand: "Fras-le", quantity: 2 },
    ],
  });
  await serveItems(page, [pads]);
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  await expect(rows.nth(0)).toContainText("N-1210 · 2 marcas");
  await expect(inventory(page).status(rows.nth(0))).toHaveText("Baixo");
  await expect(rows.nth(0)).not.toHaveAttribute("aria-expanded");
  await rows.nth(0).getByText("Pastilha dianteira").click();
  await expect(itemDetails(page).root).toBeVisible();
  await expect(rows).toHaveCount(1);
});

// Lists an item that fits two vehicles among the test items, and checks its row shows the first with "+1" and both in
// its tooltip, and that the vehicle brand filter of each vehicle finds it, the second's alone.
test("Web: an item fitting two vehicles is found by the filter of each", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const bumper = item({
    code: "PC-500",
    name: "Para-choque dianteiro",
    vehicles: [
      { vehicleBrand: "Volkswagen", vehicleModel: "Gol" },
      { vehicleBrand: "Renault", vehicleModel: "Clio" },
    ],
  });
  await serveItems(page, [bumper, ...ITEMS]);
  await page.goto("/inventory");
  const inv = inventory(page);
  const { rows } = dataTable(page);
  await expect(rows).toHaveCount(5);
  const vehicle = rows.first().getByTestId("inventory.inventory-tab.vehicle");
  await expect(vehicle).toHaveAttribute("title", "Volkswagen Gol, Renault Clio");
  await expect(vehicle).toContainText("Gol +1");

  /** Applies the vehicle brand filter of one brand. */
  const filterBy = async (brand: string) => {
    await inv.filters.click();
    const menu = filtersMenu(page);
    await menu.field("Marca do veículo").click();
    await options(page).named(brand, true).click();
    await page.keyboard.press("Escape");
    await menu.apply.click();
  };
  await filterBy("Renault");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Para-choque dianteiro");
  await inv.clearFilters.click();
  await expect(rows).toHaveCount(5);
  await filterBy("Volkswagen");
  await expect(rows.filter({ hasText: "Para-choque dianteiro" })).toHaveCount(1);
});
