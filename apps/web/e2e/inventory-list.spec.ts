import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { rgb } from "./support/expect.ts";
import { atNotebookSizes } from "./support/sizes.ts";
import { dataTable, options } from "./locators/common.ts";
import { dashboard, userMenu } from "./locators/dashboard.ts";
import { deleteItem, fillItem, inventory, itemDetails, itemForm } from "./locators/inventory.ts";
import { themes, type Mode, type Style } from "@apc/tokens/theme";
import { savedItem, serveItems } from "./stubs/items.ts";
import { testItem } from "@apc/domain/test-items";
import { item, ITEMS } from "./data/items.ts";
import { openInventory, layout } from "./support/inventory.ts";
import { apiUrl } from "./support/api.ts";

// The Inventory's list: its rows, stock alerts and states, its layout in the window, sorting, pages, and an item of
// several brands.

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

// Opens the Inventory with a few items, with none and with the API failing, and checks each time the panel reaches the
// bottom of the window (only the frame's margin under it), the pagination shows, and the page doesn't scroll. Each
// state's routes are tried before the ones of the state before it. A phone's page scrolls as a whole instead, above the
// bottom bar.
test("Web: the Inventory panel fills the window and keeps its pagination", { tag: [TEST_TAGS.inventory, TEST_TAGS.layout, TEST_TAGS.desktopOnly] }, async ({ page }) => {
  for (const [state, open] of [
    ["a few items", () => serveItems(page, ITEMS.slice(0, 2))],
    ["no items", () => serveItems(page, [])],
    ["an API error", () => page.route("**/api/**", (route) => route.fulfill({ status: 500, body: "" }))],
  ] as const) {
    await open();
    await page.goto("/inventory");
    await expect(inventory(page).pager.pages, state).toBeVisible();
    const { gapBelow, pageExtra } = await layout(page);
    expect(gapBelow, state).toBeLessThanOrEqual(16);
    expect(pageExtra, state).toBe(0);
  }
  await expect(inventory(page).pager.range("0 de 0")).toBeVisible();
});

// Opens the Inventory with 100 items on a page and scrolls the list, and checks only the list scrolls: the page stays
// put, the pagination and the toolbar in view, the table's header row pinned on top; on a 1360×768 notebook, in full
// screen and in a window, the header stays at the top too. A phone's page scrolls as a whole instead.
test("Web: only the Inventory list scrolls, also on a 1360×768 notebook", { tag: [TEST_TAGS.inventory, TEST_TAGS.layout, TEST_TAGS.desktopOnly] }, async ({ page }) => {
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

  await atNotebookSizes(page, async (size) => {
    expect((await layout(page)).pageExtra, size).toBe(0);
    expect((await dashboard(page).header.boundingBox())!.y, size).toBe(0);
    await expect(inv.newItem, size).toBeInViewport();
    await expect(inv.pager.pages, size).toBeInViewport();
    expect(await table.scroll.evaluate((box) => box.scrollHeight > box.clientHeight), size).toBe(true);
    await expect(page, size).not.toScrollSideways();
  });
});

// Sorts a list of 30 items through the API, which sorts the whole stock, not the page showing, so a sort starts over
// from the first 25 and orders codes as people read them (A-2 before A-10). The desktop sorts with the column headers,
// the phone with its round Ordenar, which names the sort on.
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
  /** Sorts by a column, with its header on the desktop and with the round Ordenar's sheet on the phone. */
  const sortBy = async (header: string, option: string) => {
    if (desktop) {
      await table.header(header).getByRole("button").click();
    } else {
      await inventory(page).sort.click();
      await options(page).named(option).click();
      await expect(inventory(page).sort).toHaveAccessibleName(`Ordenar, ${option}`);
    }
  };
  await test.step("the list starts on its second page, or wholly loaded on a phone", async () => {
    if (desktop) {
      await inventory(page).pager.page(2).click();
      await expect(rows).toHaveCount(5);
    } else {
      await expect(rows).toHaveCount(25);
      await rows.last().scrollIntoViewIfNeeded();
      await expect(rows).toHaveCount(30);
    }
  });

  await test.step("sorting by location goes back to the first 25, in natural order", async () => {
    await sortBy("Local", "Local (A → Z)");
    await expect(rows).toHaveCount(25);
    await expect(rows.nth(0)).toContainText("A-1");
    await expect(rows.nth(1)).toContainText("A-2");
    expect(queries.at(-1)).toBe("page=1&pageSize=25&sort=location&order=asc");
    if (desktop) {
      await expect(table.header("Local")).toHaveAttribute("aria-sort", "ascending");
    }
  });

  await test.step("the same column again reverses the sort", async () => {
    await sortBy("Local", "Local (Z → A)");
    await expect(rows.nth(0)).toContainText("A-30");
    expect(queries.at(-1)).toBe("page=1&pageSize=25&sort=location&order=desc");
  });

  await test.step("the unit price sorts by value, ties in part code order", async () => {
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
    apiUrl("/items"),
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

// Pages through 51 items, newest first, against an API that pages what it is asked for, 25 per page by default: each
// change of page, size, search or stock asks for the page that keeps the user's place. A phone loads more as it
// scrolls instead (see the test after this one).
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
  await test.step("the first page shows 25 items and its range", async () => {
    await expect(rows).toHaveCount(25);
    await expect(inv.pager.range("1–25 de 51")).toBeVisible();
    expect(queries.at(-1)).toBe("page=1&pageSize=25");
  });

  await test.step("page 2 asks for page 2, and 50 per page keeps the first item that was showing", async () => {
    await inv.pager.page(2).click();
    await expect(rows.first()).toContainText("P-026");
    expect(queries.at(-1)).toBe("page=2&pageSize=25");
    await inv.pager.size(50).click();
    await expect(rows).toHaveCount(50);
    await expect(inv.pager.range("1–50 de 51")).toBeVisible();
    await expect(rows.nth(25)).toContainText("P-026");
  });

  await test.step("a search goes back to page 1", async () => {
    await inv.pager.page(2).click();
    await expect(rows).toHaveCount(1);
    await inv.search.fill("Peça 1");
    await expect(inv.pager.range(/^1–\d+ de \d+$/)).toBeVisible();
    expect(queries.at(-1)).toBe("q=Pe%C3%A7a+1&page=1&pageSize=50");
    await inv.clearSearch.click();
  });

  await test.step("the user menu's Itens por página applies at once, and deleting a last page's only item goes to the page before", async () => {
    await userMenu(page).trigger.click();
    await userMenu(page).radio("100").click();
    await page.keyboard.press("Escape");
    await expect(rows).toHaveCount(51);
    await expect(inv.pager.size(100)).toHaveAttribute("aria-checked", "true");
    await inv.pager.size(25).click();
    await inv.pager.page(3).click();
    await expect(rows).toHaveCount(1);
    await deleteItem(page, "Peça 51");
    await expect(inv.pager.range("26–50 de 50")).toBeVisible();
  });

  await test.step("a new item shows first on page 1", async () => {
    await inv.newItem.first().click();
    await fillItem(page, "Novo item", { code: "nova-1", name: "peça nova", category: "Motor", partBrand: "Bosch", vehicleBrand: "Volkswagen", unitPrice: "10" });
    await itemForm(page, "Novo item").save.click();
    await expect(inv.pager.range("1–25 de 51")).toBeVisible();
    await expect(rows.first()).toContainText("NOVA-1");
  });
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
  await itemDetails(page).back.click();
  await expect(itemDetails(page).root).toBeHidden();
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  await expect(rows).toHaveCount(51);

  await inv.search.fill("Peça");
  await expect(rows).toHaveCount(25);
  expect(queries.at(-1)).toBe("q=Pe%C3%A7a&page=1&pageSize=25");
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
