import { expect, test } from "@playwright/test";
import { SESSION_STORAGE_KEY } from "@apc/shared/auth";
import { THEME_STORAGE_KEYS } from "@apc/shared/theme";
import { TEST_USERS } from "@apc/shared/test-users";
import { serveItems } from "./items.ts";
import { signIn } from "./session.ts";

const USER = TEST_USERS[0];

// The page starts at night, following a dark system, so turning dark mode off is a change.
test.use({ colorScheme: "dark" });

// Every test here starts on the Dashboard, so a test user is logged in first.
test.beforeEach(async ({ page }) => {
  await signIn(page);
  await serveItems(page, []);
});

// Opens the user menu and checks the trigger shows the logged user (the username only on desktop), turns dark mode
// off and picks GT4 with the menu staying open, and checks both apply at once and are still there after a reload.
// On the phone, the menu also stays on screen.
test("Web: the user menu changes and keeps the display preferences", async ({ page }, testInfo) => {
  await page.goto("/inventory");
  const trigger = page.getByRole("button", { name: "Menu do usuário" });
  await expect(trigger.getByText("CC")).toBeVisible();
  if (testInfo.project.name === "desktop") {
    await expect(trigger.getByText("christian.camilo")).toBeVisible();
  } else {
    await expect(trigger.getByText("christian.camilo")).toBeHidden();
  }
  await trigger.click();
  const menu = page.getByRole("menu", { name: "Menu do usuário" });
  await expect(menu.getByText("Christian Camilo")).toBeVisible();
  const box = (await menu.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);

  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-mode", "night");
  await page.getByRole("menuitemcheckbox", { name: "Modo escuro" }).click();
  await expect(html).toHaveAttribute("data-mode", "day");
  await page.getByRole("menuitemradio", { name: "GT4" }).click();
  await expect(html).toHaveAttribute("data-style", "gt4");
  await expect(menu).toBeVisible();

  await page.reload();
  await expect(html).toHaveAttribute("data-style", "gt4");
  await expect(html).toHaveAttribute("data-mode", "day");
});

// Picks GT4, then "Sair" at the end of the menu, and checks the app is on the login with the session gone and GT4
// still applied and saved; logging in again goes back to the Dashboard.
test("Web: Sair ends the session and keeps the preferences", async ({ page }) => {
  await page.goto("/inventory");
  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await page.getByRole("menuitemradio", { name: "GT4" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Usuário", { exact: true })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), SESSION_STORAGE_KEY)).toBeNull();
  await expect(page.locator("html")).toHaveAttribute("data-style", "gt4");
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEYS.style)).toBe("gt4");

  await page.getByLabel("Usuário", { exact: true }).fill(USER.username);
  await page.getByLabel("Senha", { exact: true }).fill(USER.password);
  await page.getByLabel("Senha", { exact: true }).press("Enter");
  await expect(page).toHaveURL(/\/inventory$/);
});

// Turns "Arrastar para reordenar" on and checks the tabs become draggable at once and stay so after a reload, then
// turns it off and checks they are fixed again. The MVP has a single tab, so the order itself can't change here; the
// component tests move tabs with three of them.
test("Web: the reorder choice makes the tabs draggable and comes back", async ({ page }) => {
  await page.goto("/inventory");
  const tab = page.getByRole("tab", { name: "Estoque" });
  await expect(tab).not.toHaveAttribute("draggable");
  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await page.getByRole("menuitemcheckbox", { name: /Arrastar para reordenar/ }).click();
  await expect(tab).toHaveAttribute("draggable", "true");

  await page.reload();
  await expect(tab).toHaveAttribute("draggable", "true");
  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await page.getByRole("menuitemcheckbox", { name: /Arrastar para reordenar/ }).click();
  await expect(tab).not.toHaveAttribute("draggable");
});
