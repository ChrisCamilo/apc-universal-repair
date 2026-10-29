import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, logIn, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/shared/test-tags";
import { TEST_USERS } from "@apc/shared/test-users";
import { INSTALLER_CHOICE_FILE } from "../src/server/database.ts";
import { MIN_WINDOW_SIZE, openingContentSize } from "../src/window.ts";

// The desktop app's smoke test: the compiled app on the stand-in API, with its own userData folder (support/fixtures.ts).

// Opens the app, signs in through the API, and checks the Dashboard and the empty Inventory in a window of 1280×720, or
// of what the screen's work area holds, that can't be made smaller than 1280×640. Then switches to dark mode and the Catalog tab, restarts the app with the same userData,
// and checks the session, the theme and the open tab are still there.
test("Desktop: the app signs in, shows the Inventory and keeps the session, theme and tab after a restart", { tag: [TEST_TAGS.auth, TEST_TAGS.smoke] }, async ({ launchApp }) => {
  const first = await launchApp();
  let page = await first.app.firstWindow();
  // Anything the Content-Security-Policy blocks shows up as a console error.
  const blocked: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy/i.test(message.text())) {
      blocked.push(message.text());
    }
  });
  await expect(page).toHaveURL(/^app:\/\/apc\/login/);
  await logIn(page, TEST_USERS[0]);

  await expect(page.getByText("Nenhum item cadastrado")).toBeVisible();
  // The window opens at 1280×720, or at what the screen's work area holds, and doesn't get smaller than 1280×640; the
  // page fills it. With display scaling, rounding may add up to 2 pixels.
  const window = await first.app.evaluate(({ BrowserWindow, screen }) => {
    const [window] = BrowserWindow.getAllWindows();
    const opened = window.getContentSize();
    const [outerWidth, outerHeight] = window.getSize();
    const frame = { width: outerWidth - opened[0], height: outerHeight - opened[1] };
    const workArea = screen.getDisplayMatching(window.getBounds()).workAreaSize;
    window.setContentSize(800, 600);
    return { opened, frame, workArea, smallest: window.getContentSize() };
  });
  const expected = openingContentSize(window.workArea, window.frame);
  const inner = await page.evaluate(() => [innerWidth, innerHeight]);
  for (const [[width, height], size] of [
    [window.opened, expected],
    [window.smallest, MIN_WINDOW_SIZE],
    [inner, MIN_WINDOW_SIZE],
  ] as const) {
    expect(width - size.width).toBeGreaterThanOrEqual(0);
    expect(width - size.width).toBeLessThanOrEqual(2);
    expect(height - size.height).toBeGreaterThanOrEqual(0);
    expect(height - size.height).toBeLessThanOrEqual(2);
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
  // The URL changes at once, in a transition, but the tab is open, and kept, only once the Catálogo screen renders.
  await expect(page.getByRole("tab", { name: /Catálogo/ })).toHaveAttribute("aria-selected", "true");
  expect(blocked).toEqual([]);
  await first.app.close();

  const { app } = await launchApp({ userData: first.userData });
  page = await app.firstWindow();
  await expect(page.getByRole("tab", { name: /Catálogo/ })).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\/catalog$/);
  expect(await page.evaluate(() => document.documentElement.dataset.mode)).toBe(mode);
});

// With the preload, the page still has no Node: no require and no process. The bridge gives it only its calls, for
// the notifications, the update, the server's settings and its failure. Run unpackaged, the app doesn't check for updates, so the
// update notice's live region is there and empty.
test("Desktop: the page gets only the bridge's calls, with no Node access", { tag: [TEST_TAGS.setup] }, async ({ launchApp }) => {
  const { app } = await launchApp();
  const page = await app.firstWindow();
  await expect(page).toHaveURL(/^app:\/\/apc\/login/);
  const exposed = await page.evaluate(() => ({
    require: typeof require,
    process: typeof process,
    bridge: Object.keys((window as unknown as { apcDesktop: object }).apcDesktop).sort(),
    server: Object.keys((window as unknown as { apcDesktop: { server: object } }).apcDesktop.server).sort(),
  }));
  expect(exposed).toEqual({
    require: "undefined",
    process: "undefined",
    bridge: ["notify", "onOpenNotifications", "onUpdateReady", "restartToUpdate", "server"],
    server: [
      "changeKey",
      "checkImport",
      "chooseFolder",
      "chooseSqliteFile",
      "failure",
      "firstStart",
      "importServer",
      "migrateImport",
      "networkWarnings",
      "onFailure",
      "onOpen",
      "recoveryKey",
      "recoveryKeySaved",
      "retry",
      "settings",
      "startFromScratch",
      "usePhoneAccess",
      "usePort",
      "usePostgresql",
      "useRecoveryKey",
      "useSqlite",
    ],
  });
  await expect(page.getByTestId("setup.update-notice")).toBeEmpty();
});

// Leaves the installer's PostgreSQL choice next to a config.json that sets the API address, opens the app, and checks
// it moved the choice into config.json, keeping the address, and removed the installer's file.
test("Desktop: the app takes the database the installer asked for", { tag: [TEST_TAGS.setup] }, async ({ launchApp, stubApi }) => {
  const { app, userData } = await launchApp({ files: { "config.json": JSON.stringify({ apiUrl: stubApi.url }), [INSTALLER_CHOICE_FILE]: "postgresql" } });
  await expect(await app.firstWindow()).toHaveURL(/^app:\/\/apc\/login/);
  expect(JSON.parse(readFileSync(path.join(userData, "config.json"), "utf8"))).toEqual({ apiUrl: stubApi.url, database: "postgresql" });
  expect(existsSync(path.join(userData, INSTALLER_CHOICE_FILE))).toBe(false);
});
