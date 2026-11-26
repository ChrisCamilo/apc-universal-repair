import { catalog } from "../platform/locale/locale.ts";

// The login's and the sign-up's screens, and the pairing's address and codes, as both apps write them: their fields,
// buttons and links. The messages the rules give (a wrong password, a field left empty) stay in auth.ts.

/** The login's and the sign-up's labels, buttons and links. */
export const AUTH_TEXTS = catalog(
  {
    login: {
      createAccount: "Criar conta",
      forgot: "Esqueceu a senha?",
      gotIt: "Entendi",
      logIn: "Entrar",
      noAccount: "Ainda não tem conta?",
      password: "Senha",
      username: "Usuário",
    },
    pairing: { address: "Endereço", code: "Código", entry: "Código de entrada" },
    register: {
      back: "Voltar ao login",
      confirm: "Confirmar senha",
      email: "E-mail",
      hasAccount: "Já tem conta?",
      name: "Nome",
      title: "Criar conta",
      usernameHint: "Letras minúsculas, números, pontos ou hífens.",
    },
  },
  {
    login: {
      createAccount: "Create account",
      forgot: "Forgot your password?",
      gotIt: "Got it",
      logIn: "Log in",
      noAccount: "Don't have an account yet?",
      password: "Password",
      username: "Username",
    },
    pairing: { address: "Address", code: "Code", entry: "Entry code" },
    register: {
      back: "Back to login",
      confirm: "Confirm password",
      email: "Email",
      hasAccount: "Already have an account?",
      name: "Name",
      title: "Create account",
      usernameHint: "Lowercase letters, numbers, dots or hyphens.",
    },
  },
);
