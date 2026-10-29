import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/shared/test-tags";
import { atNotebookSizes } from "./support/sizes.ts";
import { loginForm } from "./locators/auth.ts";
import { dialog } from "./locators/common.ts";
import { dashboard } from "./locators/dashboard.ts";
import { LOGIN_MESSAGES, SESSION_STORAGE_KEY } from "@apc/shared/auth";
import { TEST_USERS } from "@apc/shared/test-users";

const USER = TEST_USERS[0];

// Nobody is logged in when these start.
test.use({ signedIn: false });

// Opens /login and checks "APC Universal Repair" heads the page with both fields and "Entrar" on screen, laid out
// without sideways scroll: the badge beside the form on desktop; on a phone the brand above it, and "Criar conta" on
// screen at the bottom without scrolling.
test("Web: the login screen shows the brand and the form", { tag: [TEST_TAGS.auth, TEST_TAGS.layout] }, async ({ page, isMobile }) => {
  const form = loginForm(page);
  const { heading, mark } = dashboard(page);
  await page.goto("/login");
  await expect(heading).toBeVisible();
  await expect(form.username).toBeVisible();
  await expect(form.password).toBeVisible();
  await expect(form.submit).toBeInViewport();
  const field = (await form.username.boundingBox())!;
  if (!isMobile) {
    const markBox = (await mark.boundingBox())!;
    expect(field.x).toBeGreaterThan(markBox.x + markBox.width);
  } else {
    const headingBox = (await heading.boundingBox())!;
    expect(field.y).toBeGreaterThan(headingBox.y + headingBox.height);
    await expect(form.signUp).toBeInViewport();
  }
  await expect(page).not.toScrollSideways();
});

// Sends the login empty, then with a wrong password, then as a test user with Enter, and checks the empty fields
// get their messages, the refused login says so above the form and empties the password, and the accepted one
// saves the session with its token, which is still there after a reload, and goes on to the Dashboard.
test("Web: the login checks the fields and the user, and saves the session", { tag: [TEST_TAGS.auth, TEST_TAGS.smoke] }, async ({ page }) => {
  const form = loginForm(page);
  await page.goto("/login");
  await form.submit.click();
  await expect(page.getByText(LOGIN_MESSAGES.username)).toBeVisible();
  await expect(page.getByText(LOGIN_MESSAGES.password)).toBeVisible();
  await expect(form.username).toBeFocused();

  await form.username.fill(USER.username);
  await expect(page.getByText(LOGIN_MESSAGES.username)).toBeHidden();
  await form.password.fill("errada");
  await form.password.press("Enter");
  await expect(form.error).toHaveText(LOGIN_MESSAGES.failed);
  await expect(form.password).toHaveValue("");
  await expect(form.password).toBeFocused();
  await expect(page).toHaveURL(/\/login$/);

  await form.password.fill(USER.password);
  await form.password.press("Enter");
  await expect(page).toHaveURL(/\/inventory$/);
  await expect(dashboard(page).tab("inventory")).toHaveAttribute("aria-selected", "true");
  const session = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), SESSION_STORAGE_KEY);
  expect(await session()).toMatchObject({ username: USER.username, displayName: USER.displayName, initials: "CC", token: `token-${USER.id}` });
  await page.reload();
  expect(await session()).toMatchObject({ username: USER.username });
});

// Opens "Esqueceu a senha?", checks the notice says whom to ask and fits the screen, closes it with a click on the
// backdrop in the screen's corner, checks the focus is back on the link, then opens and closes it with "Entendi".
test("Web: the forgotten-password notice opens from the link and closes", { tag: [TEST_TAGS.auth] }, async ({ page }) => {
  await page.goto("/login");
  const link = loginForm(page).forgotPassword;
  const notice = dialog(page, "Esqueceu a senha?").root;
  await link.click();
  await expect(notice).toContainText(LOGIN_MESSAGES.forgotPassword);
  const box = (await notice.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.mouse.click(4, 4);
  await expect(notice).toBeHidden();
  await expect(link).toBeFocused();

  await link.click();
  await notice.getByRole("button", { name: "Entendi" }).click();
  await expect(notice).toBeHidden();
  await expect(link).toBeFocused();
});

// On a 1360×768 notebook, in full screen and in a window (1360×689), checks the login fits with no page scroll, down or
// sideways, and "Entrar" in view.
test("Web: on a 1360×768 notebook the login fits without scrolling", { tag: [TEST_TAGS.auth, TEST_TAGS.layout, TEST_TAGS.desktopOnly] }, async ({ page }) => {
  await page.goto("/login");
  await atNotebookSizes(page, async (size) => {
    expect(await page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight), size).toBe(0);
    await expect(page, size).not.toScrollSideways();
    await expect(loginForm(page).submit, size).toBeInViewport();
  });
});
