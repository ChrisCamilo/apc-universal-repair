import type { Page } from "@playwright/test";
import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/shared/test-tags";
import { logIn, loginForm, registerForm } from "./locators/auth.ts";
import { tour } from "./locators/common.ts";
import { logOut } from "./locators/dashboard.ts";
import { REGISTER_MESSAGES, SESSION_STORAGE_KEY } from "@apc/shared/auth";
import { TEST_USERS } from "@apc/shared/test-users";

// Nobody is logged in when these start.
test.use({ signedIn: false });

// A new user as they fill in the sign-up.
const NEW_USER = { displayName: "Ana Souza", username: "Ana.Souza", email: "ana@oficina.com", password: "freio1234" };

/**
 * Fills in every field of the sign-up.
 * @param page The test's page.
 * @param user The fields to type; the password is typed again in the confirmation.
 */
async function fillIn(page: Page, user = NEW_USER) {
  const form = registerForm(page);
  await form.displayName.fill(user.displayName);
  await form.username.fill(user.username);
  await form.email.fill(user.email);
  await form.password.fill(user.password);
  await form.confirm.fill(user.password);
}

// Opens the sign-up from the login, tries a test user's username and checks it is refused, then signs up a new user
// and checks they land on the Dashboard logged in, where the Inventory tutorial starts on this first login. Logs out
// and in again with the new user, and checks it doesn't start again; then a test user logging in on the same browser
// gets it on their own first login. Nothing scrolls sideways at either screen size.
test("Web: a new user signs up, lands on the Dashboard and logs in again", { tag: [TEST_TAGS.auth] }, async ({ page, users }) => {
  const form = registerForm(page);
  const { skip } = tour(page);
  const logInAs = async (user: { username: string; password: string }) => {
    await logIn(page, user);
    await expect(page).toHaveURL(/\/inventory$/);
  };
  const logOutOf = async () => {
    await logOut(page);
    await expect(page).toHaveURL(/\/login$/);
  };
  await page.goto("/login");
  await loginForm(page).signUp.click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page).not.toScrollSideways();

  await fillIn(page, { ...NEW_USER, username: TEST_USERS[0].username });
  await form.submit.click();
  await expect(form.error).toHaveText(REGISTER_MESSAGES.taken);

  await form.username.fill(NEW_USER.username);
  await form.confirm.press("Enter");
  await expect(page).toHaveURL(/\/inventory$/);
  expect(users.at(-1)).toMatchObject({ username: "ana.souza", displayName: "Ana Souza" });
  const session = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), SESSION_STORAGE_KEY);
  await expect(skip).toBeVisible();
  expect(await session()).toMatchObject({ username: "ana.souza", initials: "AS", inventoryTutorialSeen: true });
  await skip.click();

  await logOutOf();
  await logInAs(NEW_USER);
  await expect(page.getByText("Nenhum item cadastrado")).toBeVisible();
  await expect(skip).toBeHidden();

  await logOutOf();
  await logInAs(TEST_USERS[0]);
  await expect(skip).toBeVisible();
});

// Sends the sign-up empty and checks each field shows its message, then goes back to the login with the link.
test("Web: the sign-up checks its fields and leads back to the login", { tag: [TEST_TAGS.auth] }, async ({ page }) => {
  const form = registerForm(page);
  await page.goto("/register");
  await form.submit.click();
  for (const message of [REGISTER_MESSAGES.displayName, REGISTER_MESSAGES.username, REGISTER_MESSAGES.email, REGISTER_MESSAGES.password, REGISTER_MESSAGES.confirm]) {
    await expect(page.getByText(message)).toBeVisible();
  }
  await expect(form.displayName).toBeFocused();
  await form.logIn.click();
  await expect(page).toHaveURL(/\/login$/);
});
