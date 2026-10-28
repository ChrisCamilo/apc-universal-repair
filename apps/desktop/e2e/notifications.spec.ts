import type { ElectronApplication } from "@playwright/test";
import { expect, logIn, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/shared/test-tags";
import type { Item } from "@apc/shared/items";
import { TEST_USERS } from "@apc/shared/test-users";
import { testItem } from "@apc/shared/test-items";

// The desktop app's Windows notifications: the compiled app on a stand-in API whose one item is below its minimum
// stock, so the Inventory warns about it as it opens. The main process's Notification is replaced by one that only
// keeps what it was asked to show, and its window says whether it is focused as the test wants.

/** The one item in stock, below its minimum. */
const LOW: Item = testItem({
  id: "00000000-0000-4000-8000-000000000001",
  code: "W 712/95",
  name: "Filtro de óleo",
  category: "Motor",
  partBrand: "Mann",
  vehicleBrand: "Volkswagen",
  vehicleModel: null,
  position: "N/A",
  side: "N/A",
  color: "N/A",
  location: null,
  quantity: 1,
  minQuantity: 3,
  unitPriceCents: 3990,
  photos: [],
  createdAt: "2026-10-03T12:00:00.000Z",
  updatedAt: "2026-10-03T12:00:00.000Z",
});

test.use({ stubStock: { items: [LOW] } });

/**
 * Tells the app's window whether to say it is focused, as Windows would.
 * @param app The running app.
 * @param focused Whether it is.
 */
async function setFocused(app: ElectronApplication, focused: boolean) {
  await app.evaluate(({ BrowserWindow }, value) => {
    const [window] = BrowserWindow.getAllWindows();
    window.isFocused = () => value;
  }, focused);
}

// Logs in with the window focused: the low-stock warning goes to the bell and no Windows notification is shown. Logs
// in as another user with the window in the background: the warning is shown as a Windows notification, titled
// "Aviso"; clicking it brings the window up with the bell's menu open.
test("Desktop: warnings show as Windows notifications while the window isn't focused, and a click opens the bell", { tag: [TEST_TAGS.notifications] }, async ({ launchApp }) => {
  const { app } = await launchApp();
  const page = await app.firstWindow();
  await app.evaluate(({ Notification }) => {
    const shown: Electron.Notification[] = [];
    Object.assign(globalThis, { apcShown: shown });
    Notification.prototype.show = function show(this: Electron.Notification) {
      shown.push(this);
    };
  });
  const shown = () => app.evaluate(() => (globalThis as unknown as { apcShown: Electron.Notification[] }).apcShown.map(({ title, body }) => [title, body]));
  const bell = page.getByRole("button", { name: /^Notificações/ });

  await setFocused(app, true);
  await logIn(page, TEST_USERS[0]);
  await expect(bell).toHaveAccessibleName("Notificações, 1 não lidas");
  expect(await shown()).toEqual([]);

  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await setFocused(app, false);
  await logIn(page, TEST_USERS[1]);
  await expect.poll(shown).toEqual([["Aviso", "Estoque baixo: “Filtro de óleo” (1 de 3)"]]);

  await app.evaluate(() => (globalThis as unknown as { apcShown: Electron.Notification[] }).apcShown[0].emit("click"));
  await expect(page.getByRole("menu", { name: /^Notificações/ })).toBeVisible();
  await expect(page.getByRole("list", { name: "Últimas notificações" })).toContainText("Estoque baixo: “Filtro de óleo” (1 de 3)");
});
