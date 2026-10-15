import { expect, test } from "@playwright/test";
import { LOGIN_MESSAGES, SESSION_STORAGE_KEY } from "@apc/shared/auth";
import { TEST_USERS } from "@apc/shared/test-users";
import { serveItems } from "./items.ts";
import { serveUsers } from "./users.ts";
import { signIn } from "./session.ts";

const USER = TEST_USERS[0];

// Opens /inventory with nobody logged in, watching the page from its first script for the Dashboard's tab bar, and
// checks the user lands on /login without the Dashboard ever being drawn, then logs in and lands back on
// /inventory.
test("Web: a logged-out user goes to the login and back to where they were going", async ({ page }) => {
  await serveItems(page, []);
  await serveUsers(page);
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
  await serveItems(page, []);
  await serveUsers(page);
  await page.goto("/nao-existe");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Usuário").fill(USER.username);
  await page.getByLabel("Senha", { exact: true }).fill(USER.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inventory$/);
});

// Opens /login with a saved session and checks it goes straight to the Dashboard, without showing the form.
test("Web: a logged user skips the login", async ({ page }) => {
  await serveItems(page, []);
  await signIn(page);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/inventory$/);
  await expect(page.getByRole("tab", { name: "Estoque" })).toBeVisible();
  await expect(page.getByLabel("Usuário", { exact: true })).toHaveCount(0);
});

// Opens the Dashboard with a saved session whose token the API refuses, and checks the items call carried the token,
// the user lands on the login told the session expired, with the session gone from the device, and that logging in
// again, once the API takes the token, takes the notice away and goes back to the Dashboard.
test("Web: an expired session goes back to the login, which says so", async ({ page }) => {
  await signIn(page);
  await serveUsers(page);
  await serveItems(page, []);
  const sent: (string | null)[] = [];
  await page.route("**/api/items*", async (route) => {
    sent.push(await route.request().headerValue("authorization"));
    return route.fulfill({ status: 401, json: { statusCode: 401 } });
  });
  await page.goto("/inventory");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("status").filter({ hasText: LOGIN_MESSAGES.expired })).toBeVisible();
  expect(sent[0]).toBe(`Bearer token-${USER.id}`);
  // The saved session is put back on every load; it is gone until then.
  expect(await page.evaluate((key) => localStorage.getItem(key), SESSION_STORAGE_KEY)).toBeNull();

  await page.unroute("**/api/items*");
  await page.getByLabel("Usuário").fill(USER.username);
  await page.getByLabel("Senha", { exact: true }).fill(USER.password);
  await page.getByLabel("Senha", { exact: true }).press("Enter");
  await expect(page).toHaveURL(/\/inventory$/);
  await expect(page.getByText(LOGIN_MESSAGES.expired)).toBeHidden();
});
