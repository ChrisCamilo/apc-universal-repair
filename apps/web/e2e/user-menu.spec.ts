import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { logIn, loginForm } from "./locators/auth.ts";
import { dashboard, userMenu } from "./locators/dashboard.ts";
import { inventory } from "./locators/inventory.ts";
import { DASHBOARD_TEXTS } from "@apc/domain/app-texts";
import { LOCALE_STORAGE_KEY } from "@apc/domain/locale";
import { initials, SESSION_STORAGE_KEY } from "@apc/domain/auth";
import { THEME_STORAGE_KEYS } from "@apc/tokens/theme";
import { TEST_USERS } from "@apc/domain/test-users";

const USER = TEST_USERS[0];

// The page starts at night, following a dark system, so turning dark mode off is a change.
test.use({ colorScheme: "dark" });

// Opens the user menu and checks the trigger shows the logged user (the username only on desktop), turns dark mode
// off and picks GT4 with the menu staying open, and checks both apply at once and are still there after a reload.
// On the phone, the menu also stays on screen.
test("Web: the user menu changes and keeps the display preferences", { tag: [TEST_TAGS.dashboard, TEST_TAGS.theme] }, async ({ page, isMobile }) => {
  const { trigger, menu, checkbox, radio } = userMenu(page);
  await page.goto("/inventory");
  await expect(trigger.getByText(initials(USER.displayName))).toBeVisible();
  if (!isMobile) {
    await expect(trigger.getByText(USER.username)).toBeVisible();
  } else {
    await expect(trigger.getByText(USER.username)).toBeHidden();
  }
  await trigger.click();
  await expect(menu.getByText(USER.displayName)).toBeVisible();
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

// Picks English under "Idioma" and checks the whole session follows: the page is marked English, and the menu, the
// tabs, the Inventory and the Catalog it opens read in English; a reload keeps it. Picking Português brings it all
// back, saved too.
test("Web: the language switch changes the whole session to English and back", { tag: [TEST_TAGS.dashboard] }, async ({ page }) => {
  const html = page.locator("html");
  const saved = () => page.evaluate((key) => localStorage.getItem(key), LOCALE_STORAGE_KEY);
  await page.goto("/inventory");
  await expect(html).toHaveAttribute("lang", "pt-BR");
  await userMenu(page).trigger.click();
  await userMenu(page).radio("English").click();
  await expect(html).toHaveAttribute("lang", "en-US");
  await expect(userMenu(page, "en-US").item(DASHBOARD_TEXTS["en-US"].logOut)).toBeVisible();
  await page.keyboard.press("Escape");
  const english = dashboard(page, "en-US");
  await expect(inventory(page, "en-US").search).toBeVisible();
  await english.tab("catalog").click();
  await expect(english.panel("catalog")).toBeVisible();

  await page.reload();
  await expect(html).toHaveAttribute("lang", "en-US");
  await expect(english.tab("catalog")).toBeVisible();
  expect(await saved()).toBe("en-US");

  await userMenu(page, "en-US").trigger.click();
  await userMenu(page).radio("Português").click();
  await expect(html).toHaveAttribute("lang", "pt-BR");
  await expect(userMenu(page).item(DASHBOARD_TEXTS["pt-BR"].logOut)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dashboard(page).panel("catalog")).toBeVisible();
  expect(await saved()).toBe("pt-BR");
});
