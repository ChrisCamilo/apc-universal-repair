import type { Page } from "@playwright/test";

// The screens before the session starts: the login and the sign-up.

/**
 * The login's form, the error it shows above it, and its links.
 * @param page The test's page.
 * @returns The login's elements.
 */
export function loginForm(page: Page) {
  return {
    username: page.getByLabel("Usuário", { exact: true }),
    password: page.getByLabel("Senha", { exact: true }),
    submit: page.getByRole("button", { name: "Entrar" }),
    error: page.getByRole("alert"),
    forgotPassword: page.getByRole("button", { name: "Esqueceu a senha?" }),
    signUp: page.getByRole("button", { name: "Criar conta" }),
  };
}

/**
 * Logs in from the form with "Entrar".
 * @param page The test's page, on the login.
 * @param user The username and password to type.
 */
export async function logIn(page: Page, user: { username: string; password: string }) {
  const form = loginForm(page);
  await form.username.fill(user.username);
  await form.password.fill(user.password);
  await form.submit.click();
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
