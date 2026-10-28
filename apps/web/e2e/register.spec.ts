import { expect, test } from "./support/fixtures.ts";
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
async function fillIn(page: import("@playwright/test").Page, user = NEW_USER) {
  await page.getByLabel("Nome").fill(user.displayName);
  await page.getByLabel("Usuário").fill(user.username);
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(user.password);
  await page.getByLabel("Confirmar senha").fill(user.password);
}

// Opens the sign-up from the login, tries a test user's username and checks it is refused, then signs up a new user
// and checks they land on the Dashboard logged in, where the Inventory tutorial starts on this first login. Logs out
// and in again with the new user, and checks it doesn't start again; then a test user logging in on the same browser
// gets it on their own first login. Nothing scrolls sideways at either screen size.
test("Web: a new user signs up, lands on the Dashboard and logs in again", async ({ page, users }) => {
  const skip = page.getByRole("button", { name: "Pular tutorial" });
  const logIn = async (username: string, password: string) => {
    await page.getByLabel("Usuário").fill(username);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/inventory$/);
  };
  const logOut = async () => {
    await page.getByRole("button", { name: "Menu do usuário" }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login$/);
  };
  await page.goto("/login");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/register$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);

  await fillIn(page, { ...NEW_USER, username: TEST_USERS[0].username });
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("alert")).toHaveText(REGISTER_MESSAGES.taken);

  await page.getByLabel("Usuário").fill(NEW_USER.username);
  await page.getByLabel("Confirmar senha").press("Enter");
  await expect(page).toHaveURL(/\/inventory$/);
  expect(users.at(-1)).toMatchObject({ username: "ana.souza", displayName: "Ana Souza" });
  const session = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), SESSION_STORAGE_KEY);
  await expect(skip).toBeVisible();
  expect(await session()).toMatchObject({ username: "ana.souza", initials: "AS", inventoryTutorialSeen: true });
  await skip.click();

  await logOut();
  await logIn(NEW_USER.username, NEW_USER.password);
  await expect(page.getByText("Nenhum item cadastrado")).toBeVisible();
  await expect(skip).toBeHidden();

  await logOut();
  await logIn(TEST_USERS[0].username, TEST_USERS[0].password);
  await expect(skip).toBeVisible();
});

// Sends the sign-up empty and checks each field shows its message, then goes back to the login with the link.
test("Web: the sign-up checks its fields and leads back to the login", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: "Criar conta" }).click();
  for (const message of [REGISTER_MESSAGES.displayName, REGISTER_MESSAGES.username, REGISTER_MESSAGES.email, REGISTER_MESSAGES.password, REGISTER_MESSAGES.confirm]) {
    await expect(page.getByText(message)).toBeVisible();
  }
  await expect(page.getByLabel("Nome")).toBeFocused();
  await page.getByRole("button", { name: "Já tem conta? Entrar" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
