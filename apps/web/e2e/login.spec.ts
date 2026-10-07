import { expect, test } from "@playwright/test";
import { LOGIN_MESSAGES, SESSION_STORAGE_KEY } from "@apc/shared/auth";
import { TEST_USERS } from "@apc/shared/test-users";

const USER = TEST_USERS[0];

// Opens /login and checks the badge heads the page with both fields and "Entrar" on screen, laid out without
// sideways scroll, beside the form on desktop and above it on a phone.
test("Web: the login screen shows the badge and the form", async ({ page }, testInfo) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "APC Universal Repair" })).toBeVisible();
  await expect(page.getByLabel("Usuário")).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeInViewport();
  const mark = (await page.getByRole("img", { name: "APC Universal Repair" }).boundingBox())!;
  const field = (await page.getByLabel("Usuário").boundingBox())!;
  if (testInfo.project.name === "desktop") {
    expect(field.x).toBeGreaterThan(mark.x + mark.width);
  } else {
    expect(field.y).toBeGreaterThan(mark.y + mark.height);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
});

// Sends the login empty, then with a wrong password, then as a test user with Enter, and checks the empty fields
// get their messages, the refused login says so above the form and empties the password, and the accepted one
// saves the session, which is still there after a reload, and goes on to the Dashboard.
test("Web: the login checks the fields and the user, and saves the session", async ({ page }) => {
  await page.route("**/api/items", (route) => route.fulfill({ json: { items: [] } }));
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText(LOGIN_MESSAGES.username)).toBeVisible();
  await expect(page.getByText(LOGIN_MESSAGES.password)).toBeVisible();
  await expect(page.getByLabel("Usuário")).toBeFocused();

  await page.getByLabel("Usuário").fill(USER.username);
  await expect(page.getByText(LOGIN_MESSAGES.username)).toBeHidden();
  await page.getByLabel("Senha", { exact: true }).fill("errada");
  await page.getByLabel("Senha", { exact: true }).press("Enter");
  await expect(page.getByRole("alert")).toHaveText(LOGIN_MESSAGES.failed);
  await expect(page.getByLabel("Senha", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Senha", { exact: true })).toBeFocused();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Senha", { exact: true }).fill(USER.password);
  await page.getByLabel("Senha", { exact: true }).press("Enter");
  await expect(page).toHaveURL(/\/inventory$/);
  await expect(page.getByRole("tab", { name: "Estoque" })).toHaveAttribute("aria-selected", "true");
  const session = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), SESSION_STORAGE_KEY);
  expect(await session()).toMatchObject({ username: USER.username, displayName: USER.displayName, initials: "CC" });
  await page.reload();
  expect(await session()).toMatchObject({ username: USER.username });
});

// Opens "Esqueceu a senha?", checks the notice says whom to ask and fits the screen, closes it with a click on the
// backdrop in the screen's corner, checks the focus is back on the link, then opens and closes it with "Entendi".
test("Web: the forgotten-password notice opens from the link and closes", async ({ page }) => {
  await page.goto("/login");
  const link = page.getByRole("button", { name: "Esqueceu a senha?" });
  const dialog = page.getByRole("dialog", { name: "Esqueceu a senha?" });
  await link.click();
  await expect(dialog).toContainText(LOGIN_MESSAGES.forgotPassword);
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.mouse.click(4, 4);
  await expect(dialog).toBeHidden();
  await expect(link).toBeFocused();

  await link.click();
  await page.getByRole("button", { name: "Entendi" }).click();
  await expect(dialog).toBeHidden();
  await expect(link).toBeFocused();
});
