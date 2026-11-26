import { test, type Page } from "@playwright/test";
import { DASHBOARD_TEXTS } from "@apc/domain/app-texts";
import { AUTH_TEXTS } from "@apc/domain/auth-texts";
import { DEFAULT_LOCALE, type Locale } from "@apc/domain/locale";

// The screens before the session starts: the login and the sign-up.

/**
 * The login's form, the error it shows above it, and its links; in the desktop app, its button for the server too.
 * @param page The test's page.
 * @param locale The language the page is in; Portuguese unless given.
 * @returns The login's elements.
 */
export function loginForm(page: Page, locale: Locale = DEFAULT_LOCALE) {
  const texts = AUTH_TEXTS[locale].login;
  return {
    username: page.getByLabel(texts.username, { exact: true }),
    password: page.getByLabel(texts.password, { exact: true }),
    submit: page.getByRole("button", { name: texts.logIn }),
    error: page.getByRole("alert"),
    forgotPassword: page.getByRole("button", { name: texts.forgot }),
    signUp: page.getByRole("button", { name: texts.createAccount }),
    // The desktop app's, which opens the Servidor dialog.
    server: page.getByRole("button", { name: DASHBOARD_TEXTS[locale].serverSettings }),
  };
}

/**
 * Logs in from the form with "Entrar".
 * @param page The test's page, on the login.
 * @param user The username and password to type.
 * @param locale The language the page is in; Portuguese unless given.
 */
export async function logIn(page: Page, user: { username: string; password: string }, locale: Locale = DEFAULT_LOCALE) {
  await test.step(
    `Log in as ${user.username}`,
    async () => {
      const form = loginForm(page, locale);
      await form.username.fill(user.username);
      await form.password.fill(user.password);
      await form.submit.click();
    },
    { box: true },
  );
}

/**
 * The sign-up's form, the error it shows above it, and its link back to the login; on a phone, the title and the
 * back arrow to the login too.
 * @param page The test's page.
 * @returns The sign-up's elements.
 */
export function registerForm(page: Page) {
  return {
    displayName: page.getByLabel("Nome"),
    username: page.getByLabel("Usuário", { exact: true }),
    email: page.getByLabel("E-mail"),
    password: page.getByLabel("Senha", { exact: true }),
    confirm: page.getByLabel("Confirmar senha"),
    submit: page.getByRole("button", { name: "Criar conta" }),
    error: page.getByRole("alert"),
    logIn: page.getByRole("button", { name: "Já tem conta? Entrar" }),
    heading: page.getByRole("heading", { level: 1, name: "Criar conta" }),
    back: page.getByRole("button", { name: "Voltar ao login" }),
  };
}
