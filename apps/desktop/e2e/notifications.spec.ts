import { mkdtempSync } from "node:fs";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, expect, test, type ElectronApplication, type Page } from "@playwright/test";
import type { Item } from "@apc/shared/items";
import { TEST_USERS } from "@apc/shared/test-users";
import { startStubApi } from "./stubApi.ts";

// The desktop app's Windows notifications: the compiled app (dist/main.js) with the web build, on a stand-in API whose
// one item is below its minimum stock, so the Inventory warns about it as it opens. The main process's Notification is
// replaced by one that only keeps what it was asked to show, and its window says whether it is focused as the test
// wants. Run `pnpm --filter @apc/web build` and `pnpm run build` first, as for the smoke test.

/** The desktop app's folder, which Electron opens as the app. */
const APP_DIR = path.join(import.meta.dirname, "..");
/** The one item in stock, below its minimum. */
const LOW: Item = {
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
};

let api: { server: Server; url: string };

/**
 * Logs a test user in from the login screen.
 * @param page The app's window.
 * @param user The test user.
 */
async function logIn(page: Page, user: (typeof TEST_USERS)[number]) {
  await page.getByLabel("Usuário", { exact: true }).fill(user.username);
  await page.getByLabel("Senha", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("tab", { name: "Estoque" })).toHaveAttribute("aria-selected", "true");
}

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

test.beforeAll(async () => {
  api = await startStubApi([LOW]);
});

test.afterAll(async () => {
  await new Promise((resolve) => api.server.close(resolve));
});

// Logs in with the window focused: the low-stock warning goes to the bell and no Windows notification is shown. Logs
// in as another user with the window in the background: the warning is shown as a Windows notification, titled
// "Aviso"; clicking it brings the window up with the bell's menu open.
test("Desktop: warnings show as Windows notifications while the window isn't focused, and a click opens the bell", async () => {
  const env: Record<string, string> = { ...(process.env as Record<string, string>), APC_API_URL: api.url, APC_USER_DATA: mkdtempSync(path.join(tmpdir(), "apc-desktop-")) };
  // With it set, Electron runs as plain Node instead of opening the app.
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: [APP_DIR], env });
  try {
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
  } finally {
    await app.close();
  }
});
