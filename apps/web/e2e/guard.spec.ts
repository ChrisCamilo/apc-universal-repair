import { expect, test } from "@playwright/test";
import { TEST_USERS } from "@apc/shared/test-users";
import { signIn } from "./session.ts";

const USER = TEST_USERS[0];

// Opens /inventory with nobody logged in, watching the page from its first script for the Dashboard's tab bar, and
// checks the user lands on /login without the Dashboard ever being drawn, then logs in and lands back on
// /inventory.
test("Web: a logged-out user goes to the login and back to where they were going", async ({ page }) => {
  await page.route("**/api/items", (route) => route.fulfill({ json: { items: [] } }));
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.querySelector('[role="tablist"]')) {
        localStorage.setItem("saw-dashboard", "yes");
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/inventory");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Usuário")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("saw-dashboard"))).toBeNull();

  await page.getByLabel("Usuário").fill(USER.username);
  await page.getByLabel("Senha", { exact: true }).fill(USER.password);
  await page.getByLabel("Senha", { exact: true }).press("Enter");
  await expect(page).toHaveURL(/\/inventory$/);
  await expect(page.getByRole("tab", { name: "Estoque" })).toHaveAttribute("aria-selected", "true");
});

// Opens an unknown path with nobody logged in and checks it also goes to the login, and on to the Dashboard after.
test("Web: an unknown path asks for the login too", async ({ page }) => {
  await page.route("**/api/items", (route) => route.fulfill({ json: { items: [] } }));
  await page.goto("/nao-existe");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Usuário").fill(USER.username);
  await page.getByLabel("Senha", { exact: true }).fill(USER.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inventory$/);
});

// Opens /login with a saved session and checks it goes straight to the Dashboard, without showing the form.
test("Web: a logged user skips the login", async ({ page }) => {
  await page.route("**/api/items", (route) => route.fulfill({ json: { items: [] } }));
  await signIn(page);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/inventory$/);
  await expect(page.getByRole("tab", { name: "Estoque" })).toBeVisible();
  await expect(page.getByLabel("Usuário", { exact: true })).toHaveCount(0);
});
