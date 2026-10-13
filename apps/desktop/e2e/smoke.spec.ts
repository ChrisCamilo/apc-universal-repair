import { mkdtempSync } from "node:fs";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, expect, test, type ElectronApplication } from "@playwright/test";
import { INVENTORY_TUTORIAL_STORAGE_KEY } from "@apc/shared/inventory-tutorial";
import { TEST_USERS } from "@apc/shared/test-users";
import { startStubApi } from "./stubApi.ts";

// The desktop app's smoke test: the compiled main process (dist/main.js) with the web build, pointed at a stand-in
// API on this computer, with its own userData folder. Run `pnpm --filter @apc/web build` and `pnpm run build` first,
// which `pnpm test:e2e` from the root does through Turbo.

/** The desktop app's folder, which Electron opens as the app. */
const APP_DIR = path.join(import.meta.dirname, "..");

let api: { server: Server; url: string };

/**
 * Opens the desktop app on the stand-in API.
 * @param userData The app's userData folder, kept between launches to check what survives a restart.
 * @returns The running app.
 */
async function launch(userData: string): Promise<ElectronApplication> {
  const env: Record<string, string> = { ...(process.env as Record<string, string>), APC_API_URL: api.url, APC_USER_DATA: userData };
  // With it set, Electron runs as plain Node instead of opening the app.
  delete env.ELECTRON_RUN_AS_NODE;
  return electron.launch({ args: [APP_DIR], env });
}

test.beforeAll(async () => {
  api = await startStubApi();
});

test.afterAll(async () => {
  await new Promise((resolve) => api.server.close(resolve));
});

// Opens the app, signs in through the API, and checks the Dashboard and the empty Inventory at 1280×720, a window
// that can't be made smaller. Then switches to dark mode and the Catalog tab, restarts the app with the same userData,
// and checks the session, the theme and the open tab are still there.
test("Desktop: the app signs in, shows the Inventory and keeps the session, theme and tab after a restart", async () => {
  const userData = mkdtempSync(path.join(tmpdir(), "apc-desktop-"));
  const { username, password } = TEST_USERS[0];

  let app = await launch(userData);
  let page = await app.firstWindow();
  // Anything the Content-Security-Policy blocks shows up as a console error.
  const blocked: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy/i.test(message.text())) {
      blocked.push(message.text());
    }
  });
  await expect(page).toHaveURL(/^app:\/\/apc\/login/);
  // The tutorial counts as seen, so it doesn't start over the empty Inventory.
  await page.evaluate((key) => localStorage.setItem(key, "true"), INVENTORY_TUTORIAL_STORAGE_KEY);
  await page.reload();
  await page.getByLabel("Usuário").fill(username);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("tab", { name: "Estoque" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Nenhum item cadastrado")).toBeVisible();
  // The page opens at 1280×720 and doesn't get smaller. With display scaling, rounding may add a pixel.
  const sizes = await app.evaluate(({ BrowserWindow }) => {
    const [window] = BrowserWindow.getAllWindows();
    const opened = window.getContentSize();
    window.setContentSize(800, 600);
    return [opened, window.getContentSize()];
  });
  sizes.push(await page.evaluate(() => [innerWidth, innerHeight]));
  for (const [width, height] of sizes) {
    expect(width - 1280).toBeGreaterThanOrEqual(0);
    expect(width - 1280).toBeLessThanOrEqual(1);
    expect(height - 720).toBeGreaterThanOrEqual(0);
    expect(height - 720).toBeLessThanOrEqual(1);
  }

  const modeOf = () => page.evaluate(() => document.documentElement.dataset.mode);
  const before = await modeOf();
  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Modo escuro" }).click();
  await page.keyboard.press("Escape");
  await expect.poll(modeOf).not.toBe(before);
  const mode = await modeOf();
  await page.getByRole("tab", { name: /Catálogo/ }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  expect(blocked).toEqual([]);
  await app.close();

  app = await launch(userData);
  page = await app.firstWindow();
  await expect(page.getByRole("tab", { name: /Catálogo/ })).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\/catalog$/);
  expect(await page.evaluate(() => document.documentElement.dataset.mode)).toBe(mode);
  await app.close();
});
