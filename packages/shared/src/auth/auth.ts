// Login rules shared by the web and mobile login screens: which fields must be filled before the login is sent,
// and what each one says when it is empty.

/** Message under each login field left empty. */
export const LOGIN_MESSAGES = { username: "Informe o usuário.", password: "Informe a senha." } as const;

/** What the login form sends. */
export type Credentials = { username: string; password: string };
/** The message of each field that can't be sent as it is; a field without one is fine. */
export type LoginErrors = Partial<Record<keyof Credentials, string>>;

/**
 * Checks the login fields before sending them: the user can't be empty or only spaces, and the password can't
 * be empty (spaces may be part of a password).
 * @param credentials The fields as typed.
 * @returns The message of each empty field, in form order; empty when the login can be sent.
 */
export function loginErrors({ username, password }: Credentials): LoginErrors {
  return {
    ...(username.trim() === "" && { username: LOGIN_MESSAGES.username }),
    ...(password === "" && { password: LOGIN_MESSAGES.password }),
  };
}
