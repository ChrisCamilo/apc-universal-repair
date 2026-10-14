import { expect, test, type Page } from "@playwright/test";
import type { Item } from "@apc/shared/items";
import { TEST_USERS } from "@apc/shared/test-users";
import { themes, type Mode, type Style } from "@apc/shared/theme";
import { serveItems } from "./items.ts";
import { signIn } from "./session.ts";

const ITEMS: Item[] = [item("00000000-0000-4000-8000-000000000001", "Filtro de óleo"), item("00000000-0000-4000-8000-000000000002", "Bomba d'água")];

/**
 * Fills in an item with the fields the bell doesn't look at.
 * @param id Its id.
 * @param name Its name.
 * @returns A complete item.
 */
function item(id: string, name: string): Item {
  return {
    id,
    code: id.slice(-4),
    name,
    category: "Motor",
    partBrand: "Mann",
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
  };
}

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
  await signIn(page);
  await serveItems(page, [...ITEMS]);
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
