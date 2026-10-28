import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/shared/test-tags";
import { logIn, loginForm } from "./locators/auth.ts";
import { dashboard, userMenu } from "./locators/dashboard.ts";
import { SESSION_STORAGE_KEY } from "@apc/shared/auth";
import { THEME_STORAGE_KEYS } from "@apc/shared/theme";
import { TEST_USERS } from "@apc/shared/test-users";

const USER = TEST_USERS[0];

// The page starts at night, following a dark system, so turning dark mode off is a change.
test.use({ colorScheme: "dark" });

// Opens the user menu and checks the trigger shows the logged user (the username only on desktop), turns dark mode
// off and picks GT4 with the menu staying open, and checks both apply at once and are still there after a reload.
// On the phone, the menu also stays on screen.
test("Web: the user menu changes and keeps the display preferences", { tag: [TEST_TAGS.dashboard, TEST_TAGS.theme] }, async ({ page }, testInfo) => {
  const { trigger, menu, checkbox, radio } = userMenu(page);
  await page.goto("/inventory");
  await expect(trigger.getByText("CC")).toBeVisible();
  if (testInfo.project.name === "desktop") {
    await expect(trigger.getByText("christian.camilo")).toBeVisible();
  } else {
    await expect(trigger.getByText("christian.camilo")).toBeHidden();
  }
  await trigger.click();
  await expect(menu.getByText("Christian Camilo")).toBeVisible();
  const box = (await menu.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);

  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-mode", "night");
  await checkbox("Modo escuro").click();
  await expect(html).toHaveAttribute("data-mode", "day");
  await radio("GT4").click();
  await expect(html).toHaveAttribute("data-style", "gt4");
  await expect(menu).toBeVisible();

  await page.reload();
  await expect(html).toHaveAttribute("data-style", "gt4");
  await expect(html).toHaveAttribute("data-mode", "day");
});

// Picks GT4, then "Sair" at the end of the menu, and checks the app is on the login with the session gone and GT4
// still applied and saved; logging in again goes back to the Dashboard.
test("Web: Sair ends the session and keeps the preferences", { tag: [TEST_TAGS.dashboard] }, async ({ page }) => {
  const { trigger, radio, item } = userMenu(page);
  await page.goto("/inventory");
  await trigger.click();
  await radio("GT4").click();
  await item("Sair").click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(loginForm(page).username).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), SESSION_STORAGE_KEY)).toBeNull();
  await expect(page.locator("html")).toHaveAttribute("data-style", "gt4");
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEYS.style)).toBe("gt4");

  await logIn(page, USER);
  await expect(page).toHaveURL(/\/inventory$/);
});

// Turns "Arrastar para reordenar" on and checks the tabs become draggable at once and stay so after a reload, then
// turns it off and checks they are fixed again. The MVP has a single tab, so the order itself can't change here; the
// component tests move tabs with three of them.
test("Web: the reorder choice makes the tabs draggable and comes back", { tag: [TEST_TAGS.dashboard] }, async ({ page }) => {
  const { trigger, checkbox } = userMenu(page);
  await page.goto("/inventory");
  const tab = dashboard(page).tab("inventory");
  await expect(tab).not.toHaveAttribute("draggable");
  await trigger.click();
  await checkbox(/Arrastar para reordenar/).click();
  await expect(tab).toHaveAttribute("draggable", "true");

  await page.reload();
  await expect(tab).toHaveAttribute("draggable", "true");
  await trigger.click();
  await checkbox(/Arrastar para reordenar/).click();
  await expect(tab).not.toHaveAttribute("draggable");
});
