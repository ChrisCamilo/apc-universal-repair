import type { Page } from "@playwright/test";
import { expect, test } from "./support/fixtures.ts";
import type { Item, ItemCreate } from "@apc/shared/items";
import { TEST_USERS } from "@apc/shared/test-users";
import { themes, type Mode, type Style } from "@apc/shared/theme";
import { TOAST_DURATION, TOAST_FADE_MS } from "@apc/shared/toast";
import { savedItem, serveItems } from "./stubs/items.ts";
import { signIn } from "./stubs/session.ts";
import { item } from "./data/items.ts";

const ITEMS: Item[] = [item({ id: "00000000-0000-4000-8000-000000000001", code: "0001", name: "Filtro de óleo" }), item({ id: "00000000-0000-4000-8000-000000000002", code: "0002", name: "Bomba d'água" })];

// The Inventory the tests start on, unless a test serves its own.
test.use({ stock: { items: ITEMS } });

/**
 * Deletes an item from its trash button and confirms, so its toast shows.
 * @param page The test's page.
 * @param name The item's name.
 */
async function deleteItem(page: Page, name: string) {
  await page.getByRole("button", { name: `Excluir ${name}` }).click();
  await page.getByRole("dialog", { name: "Excluir item?" }).getByRole("button", { name: "Excluir" }).click();
}

/**
 * Saves an item's edit unchanged, so the info toast shows, and measures how long it stays in the page.
 * @param page The test's page.
 * @returns The time from the toast showing to it leaving the page, fade-out included, in ms.
 */
async function toastLifetime(page: Page): Promise<number> {
  await page.getByRole("button", { name: "Editar Filtro de óleo" }).click();
  const lifetime = page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let shown = 0;
        const observer = new MutationObserver(() => {
          const pill = document.querySelector('[data-testid="common.toast.message"]');
          if (pill && !shown) {
            shown = performance.now();
          } else if (!pill && shown) {
            observer.disconnect();
            resolve(performance.now() - shown);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }),
  );
  await page.getByRole("dialog", { name: "Editar item" }).getByRole("button", { name: "Salvar" }).click();
  return lifetime;
}

/**
 * Converts a hex color to the `rgb(r, g, b)` form the browser reports for computed styles.
 * @param hex Color as `#RRGGBB`.
 * @returns The same color as `rgb(r, g, b)`.
 */
function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

// Deletes one item, and fails to delete another, and checks the bell, to the left of the user menu, counts 2 unread;
// its menu lists the error and then the success, each in its kind's color, and opening it clears the count. After a
// reload both are still listed; another user logging in on the same browser has none, and "Limpar notificações"
// empties the list.
test("Web: the bell keeps the latest toasts for each user", async ({ page }) => {
  let deletes = 0;
  await page.route("**/api/items/*", (route) => route.fulfill({ status: ++deletes === 1 ? 204 : 500, body: "" }));
  await page.goto("/inventory");
  const bell = page.getByRole("button", { name: /^Notificações/ });
  await expect(bell).toHaveAccessibleName("Notificações");

  await deleteItem(page, "Filtro de óleo");
  await expect(page.getByText("Item “Filtro de óleo” excluído.")).toBeVisible();
  await deleteItem(page, "Bomba d'água");
  await expect(page.getByRole("alert").getByText("Não foi possível excluir o item. Tente de novo.")).toBeVisible();
  await page.getByRole("dialog", { name: "Excluir item?" }).getByRole("button", { name: "Cancelar" }).click();
  await expect(bell).toHaveAccessibleName("Notificações, 2 não lidas");
  await expect(bell.getByTestId("notifications.bell.badge")).toHaveText("2");
  const [bellBox, userBox] = [await bell.boundingBox(), await page.getByRole("button", { name: "Menu do usuário" }).boundingBox()];
  expect(bellBox!.x + bellBox!.width).toBeLessThanOrEqual(userBox!.x);

  await bell.click();
  const entries = page.getByRole("list", { name: "Últimas notificações" }).getByRole("listitem");
  await expect(entries).toHaveText([/Não foi possível excluir o item\. Tente de novo\.\s*agora/, /Item “Filtro de óleo” excluído\.\s*agora/]);
  const [style, mode] = await page.evaluate(() => [document.documentElement.dataset.style, document.documentElement.dataset.mode]);
  const { colors } = themes[style as Style][mode as Mode];
  await expect(entries.nth(0).getByTestId("notifications.menu.list.item.icon")).toHaveCSS("color", rgb(colors.danger));
  await expect(entries.nth(1).getByTestId("notifications.menu.list.item.icon")).toHaveCSS("color", rgb(colors.success));
  await expect(bell).toHaveAccessibleName("Notificações");
  await page.keyboard.press("Escape");

  await page.reload();
  await expect(bell).toHaveAccessibleName("Notificações");
  await bell.click();
  await expect(entries).toHaveCount(2);
  await page.keyboard.press("Escape");

  const other = await page.context().newPage();
  await signIn(other, true, TEST_USERS[1]);
  await serveItems(other, [...ITEMS]);
  await other.goto("/inventory");
  await other.getByRole("button", { name: /^Notificações/ }).click();
  await expect(other.getByText("Nenhuma notificação")).toBeVisible();
  await other.close();

  await bell.click();
  await page.getByRole("menuitem", { name: "Limpar notificações" }).click();
  await bell.click();
  await expect(page.getByText("Nenhuma notificação")).toBeVisible();
  await expect(entries).toHaveCount(0);
});

// Measures how long a toast stays: 5 s by default. Sets 3 s with the gear in the bell's menu, and checks the next toast
// stays 3 s and the time is still 3 s after a reload; − stops at 2 s and + at 15 s.
test("Web: the gear sets how long a toast stays", async ({ page }) => {
  await page.goto("/inventory");
  const fade = TOAST_FADE_MS + 300;
  const byDefault = await toastLifetime(page);
  expect(byDefault).toBeGreaterThanOrEqual(TOAST_DURATION.defaultMs);
  expect(byDefault).toBeLessThan(TOAST_DURATION.defaultMs + fade + 500);

  const bell = page.getByRole("button", { name: /^Notificações/ });
  const setting = page.getByRole("group", { name: "Tempo do aviso" });
  const value = setting.getByRole("status");
  await bell.click();
  await page.getByRole("button", { name: "Configurações das notificações" }).click();
  await expect(value).toHaveText("5 s");
  await setting.getByRole("button", { name: "Diminuir o tempo do aviso" }).click();
  await setting.getByRole("button", { name: "Diminuir o tempo do aviso" }).click();
  await expect(value).toHaveText("3 s");
  await page.keyboard.press("Escape");
  const picked = await toastLifetime(page);
  expect(picked).toBeGreaterThanOrEqual(3000);
  expect(picked).toBeLessThan(4000);

  await page.reload();
  await bell.click();
  await page.getByRole("button", { name: "Configurações das notificações" }).click();
  await expect(value).toHaveText("3 s");
  const shorter = setting.getByRole("button", { name: "Diminuir o tempo do aviso" });
  const longer = setting.getByRole("button", { name: "Aumentar o tempo do aviso" });
  await shorter.click();
  await expect(value).toHaveText("2 s");
  await expect(shorter).toBeDisabled();
  for (let press = 0; press < 13; press++) await longer.click();
  await expect(value).toHaveText("15 s");
  await expect(longer).toBeDisabled();
});

// Opens the Inventory with an item already low: the bell gets its warning without a toast. Saving another item at its
// minimum shows the warning as a toast and adds it to the bell; saving it again while still low adds no other; importing
// two items below their minimum adds one warning for both.
test("Web: items reaching their minimum stock are warned about once", async ({ page }) => {
  const stock: Item[] = [{ ...ITEMS[0], quantity: 6, minQuantity: 2 }, { ...item({ id: "00000000-0000-4000-8000-000000000003", code: "0003", name: "Correia dentada" }), quantity: 0 }];
  await serveItems(page, stock);
  await page.route("**/api/items/*", (route) => {
    const index = stock.findIndex((held) => route.request().url().endsWith(held.id));
    stock[index] = savedItem(route.request().postDataJSON(), stock[index]);
    return route.fulfill({ json: stock[index] });
  });
  await page.route("**/api/items/import", (route) => {
    for (const sent of route.request().postDataJSON().items as ItemCreate[]) {
      stock.unshift(savedItem(sent));
    }
    return route.fulfill({ json: { created: 2, updated: 0 } });
  });
  await page.goto("/inventory");
  const bell = page.getByRole("button", { name: /^Notificações/ });
  await expect(bell).toHaveAccessibleName("Notificações, 1 não lidas");
  await expect(page.getByTestId("common.toast.message")).toHaveCount(0);

  const saveQuantity = async (quantity: string) => {
    await page.getByRole("button", { name: "Editar Filtro de óleo" }).click();
    const dialog = page.getByRole("dialog", { name: "Editar item" });
    await dialog.getByLabel("Quantidade", { exact: true }).fill(quantity);
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(dialog).toBeHidden();
  };
  await saveQuantity("2");
  await expect(page.getByRole("alert").getByText("Estoque baixo: “Filtro de óleo” (2 de 2)")).toBeVisible();
  await saveQuantity("1");
  await expect(page.getByText("Item “Filtro de óleo” salvo.").last()).toBeVisible();

  await page.getByRole("button", { name: "Importar CSV" }).click();
  const importer = page.getByRole("dialog", { name: "Importar CSV" });
  const file = [
    "code;name;category;part_brand;vehicle_brand;vehicle_model;quantity;minimum;location;unit_price;color;position;side",
    "ngk-b7;Vela de ignição;Motor;Mann;Volkswagen;;1;4;;34,90;;;",
    "fr-20;Fluido de freio;Motor;Mann;Volkswagen;;0;2;;29,90;;;",
  ].join("\n");
  await importer.getByLabel("Arquivo CSV").setInputFiles({ name: "estoque.csv", mimeType: "text/csv", buffer: Buffer.from(file) });
  await importer.getByRole("button", { name: "Importar 2 itens" }).click();
  await expect(page.getByRole("alert").getByText("Estoque baixo em 2 itens")).toBeVisible();

  await bell.click();
  const warnings = page.getByRole("list", { name: "Últimas notificações" }).getByRole("listitem").filter({ hasText: "Estoque baixo" });
  await expect(warnings).toHaveText([/^Estoque baixo em 2 itens/, /^Estoque baixo: “Filtro de óleo” \(2 de 2\)/, /^Estoque baixo: “Correia dentada” \(0 de 0\)/]);
});
