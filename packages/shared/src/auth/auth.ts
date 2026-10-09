import { z } from "zod";

// Login and sign-up shared by the web and mobile apps: which fields must be filled before the login is sent, the
// sign-up rules the API checks too, and the two AuthServices. The apps use the API's (createApiAuth): the users live
// in the database, the test users of @apc/shared/test-users seeded there, and the API checks the password. The mock
// (createMockAuth) checks the test users kept in the repo, for tests and stories. Both save the session on the device
// through the store each app hands over (localStorage on the web, AsyncStorage on mobile); real sessions, with
// tokens the API checks, come with EP-10. The screens only see AuthService.

/**
 * Messages of the login form: under each field left empty, above the form when the login is refused, and in the
 * dialog "Esqueceu a senha?" opens while there is no password reset (EP-10).
 */
export const LOGIN_MESSAGES = {
  username: "Informe o usuário.",
  password: "Informe a senha.",
  failed: "Usuário ou senha incorretos.",
  unreachable: "Não foi possível entrar. Verifique a conexão e tente de novo.",
  forgotPassword: "Peça ao administrador da oficina para redefinir sua senha.",
} as const;
/** How long the mocked login takes to answer, so the screens show their loading state as with a real server. */
export const MOCK_LOGIN_DELAY_MS = 400;
/** The fewest characters a new password takes. */
export const PASSWORD_MIN_LENGTH = 8;
/** Messages of the sign-up form: under each field that breaks a rule, and above the form when the API refuses it. */
export const REGISTER_MESSAGES = {
  displayName: "Informe seu nome.",
  username: "Informe o usuário.",
  usernameFormat: "Use de 3 a 32 letras minúsculas, números, pontos ou hífens.",
  email: "Informe o e-mail.",
  emailFormat: "Informe um e-mail válido, como nome@exemplo.com.",
  password: "Informe a senha.",
  passwordShort: `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  confirm: "Repita a senha.",
  confirmMismatch: "As senhas não conferem.",
  taken: "Esse usuário já existe.",
  failed: "Não foi possível criar a conta. Verifique a conexão e tente de novo.",
} as const;
/** Storage key of the saved session. */
export const SESSION_STORAGE_KEY = "apc-session";
/** A username: 3 to 32 lowercase letters, digits, dots or hyphens, e.g. "christian.camilo". */
export const USERNAME_PATTERN = /^[a-z0-9.-]{3,32}$/;
/** What POST /sessions takes: the username, ignoring case and surrounding spaces, and the password. */
export const credentialsSchema = z.object({ username: z.string().trim().toLowerCase().min(1), password: z.string().min(1) });
/** The logged user, as the session keeps them and the API answers a login or sign-up with. */
export const sessionUserSchema = z.object({ id: z.string(), username: z.string(), displayName: z.string(), initials: z.string() });
/** What POST /users takes: the sign-up fields, under the same rules as the form. The e-mail is only kept for now. */
export const userCreateSchema = z.object({
  displayName: z.string().trim().min(1, REGISTER_MESSAGES.displayName),
  username: z.string().trim().toLowerCase().regex(USERNAME_PATTERN, REGISTER_MESSAGES.usernameFormat),
  email: z.string().trim().pipe(z.email(REGISTER_MESSAGES.emailFormat)),
  password: z.string().min(PASSWORD_MIN_LENGTH, REGISTER_MESSAGES.passwordShort),
});

/** Logs in and out and tells who is logged in; the mock now, the real backend with EP-10. */
export type AuthService = {
  /**
   * Checks the user and password; resolves with the logged user, or null when they don't match, and rejects when the
   * check can't be made (e.g. the API is out of reach).
   */
  login: (credentials: Credentials) => Promise<SessionUser | null>;
  /** Creates a user and logs them in; resolves with the user, or the message saying why it was refused. */
  register: (user: UserCreate) => Promise<RegisterResult>;
  /** Ends the session. */
  logout: () => Promise<void>;
  /** The user of the saved session, or null when nobody is logged in. */
  currentUser: () => Promise<SessionUser | null>;
};
/** What the login form sends. */
export type Credentials = { username: string; password: string };
/** The message of each field that can't be sent as it is; a field without one is fine. */
export type LoginErrors = Partial<Record<"username" | "password", string>>;
/** The sign-up form as typed: the user to create and the password typed again. */
export type Registration = UserCreate & { confirm: string };
/** The message of each sign-up field that breaks a rule; a field without one is fine. */
export type RegisterErrors = Partial<Record<keyof Registration, string>>;
/** How a sign-up ends: the user created and logged in, or the message saying why it was refused. */
export type RegisterResult = { user: SessionUser } | { refused: string };
/** Where the session is saved: the device storage, with the shape of AsyncStorage. */
export type SessionStore = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};
/** The logged user, as the session keeps them. */
export type SessionUser = z.infer<typeof sessionUserSchema>;
/** A test user of the mocked login, and seeded in the database: who they are and their test password. */
export type TestUser = Omit<SessionUser, "initials"> & { password: string };
/** A user to create, as the sign-up form sends it. */
export type UserCreate = z.input<typeof userCreateSchema>;

/**
 * Builds the login and sign-up of the apps, through the API: POST /sessions checks the user and password, POST /users
 * creates a user; either way the user the API answers with is saved in the store as the session.
 * @param store Where the session is saved on the device.
 * @param apiBase Where the API answers, e.g. "/api" on the web.
 * @param send How requests are sent: the global fetch as it is when each one is sent, or a stand-in in tests.
 * @returns The AuthService on the API.
 */
export function createApiAuth(store: SessionStore, apiBase: string, send: typeof fetch = (input, init) => fetch(input, init)): AuthService {
  const post = (path: string, body: unknown) =>
    send(`${apiBase}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return {
    login: async (credentials) => {
      const response = await post("/sessions", credentials);
      if (response.status === 401) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`The login answered ${response.status}.`);
      }
      return keepSession(store, sessionUserSchema.parse(await response.json()));
    },
    register: async (user) => {
      const response = await post("/users", user).catch(() => null);
      if (response?.status === 409) {
        return { refused: REGISTER_MESSAGES.taken };
      }
      if (!response?.ok) {
        return { refused: REGISTER_MESSAGES.failed };
      }
      return { user: await keepSession(store, sessionUserSchema.parse(await response.json())) };
    },
    logout: () => store.removeItem(SESSION_STORAGE_KEY),
    currentUser: async () => readSession(await store.getItem(SESSION_STORAGE_KEY)),
  };
}

/**
 * Builds the mocked login on a device store: the user (ignoring case and surrounding spaces) and the password
 * must match a test user, or one signed up on this service; the session is then saved in the store and read back
 * from it, also after a reload.
 * @param store Where the session is saved on the device.
 * @param users The users who can log in: the repo's test users (@apc/shared/test-users).
 * @param delayMs How long a login or sign-up takes to answer.
 * @returns The mocked AuthService.
 */
export function createMockAuth(store: SessionStore, users: readonly TestUser[], delayMs = MOCK_LOGIN_DELAY_MS): AuthService {
  const known = [...users];
  const wait = () => new Promise<void>((resolve) => setTimeout(resolve, delayMs));
  return {
    login: async ({ username, password }) => {
      await wait();
      const user = known.find((test) => test.username === username.trim().toLowerCase() && test.password === password);
      return user ? keepSession(store, sessionOf(user)) : null;
    },
    register: async (create) => {
      await wait();
      const { displayName, username, password } = userCreateSchema.parse(create);
      if (known.some((test) => test.username === username)) {
        return { refused: REGISTER_MESSAGES.taken };
      }
      const user = { id: `user-${username}`, username, displayName, password };
      known.push(user);
      return { user: await keepSession(store, sessionOf(user)) };
    },
    logout: () => store.removeItem(SESSION_STORAGE_KEY),
    currentUser: async () => readSession(await store.getItem(SESSION_STORAGE_KEY)),
  };
}

/**
 * Takes a name's initials for the user badge: the first letters of its first and last words.
 * @param displayName The user's name, e.g. "Christian Camilo".
 * @returns The initials in uppercase, e.g. "CC"; one letter for a one-word name.
 */
export function initials(displayName: string): string {
  const words = displayName.trim().split(/\s+/);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters.map((word) => word.charAt(0)).join("").toUpperCase();
}

/**
 * Saves a logged user as the session on the device.
 * @param store Where the session is saved.
 * @param user The logged user.
 * @returns The same user.
 */
async function keepSession(store: SessionStore, user: SessionUser): Promise<SessionUser> {
  await store.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  return user;
}

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

/**
 * Reads a saved session back, ignoring one that isn't a session any more (e.g. edited by hand or from an older
 * version), which then counts as nobody logged in.
 * @param saved What the store holds under the session key.
 * @returns The logged user, or null.
 */
function readSession(saved: string | null): SessionUser | null {
  if (saved === null) {
    return null;
  }
  try {
    const parsed = sessionUserSchema.safeParse(JSON.parse(saved));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Checks the sign-up fields before sending them, under the rules of userCreateSchema: the name and the username
 * can't be empty or only spaces, the username takes 3 to 32 lowercase letters, digits, dots or hyphens (typed in any
 * case), the e-mail must look like one, the password needs PASSWORD_MIN_LENGTH characters and the confirmation must
 * repeat it.
 * @param registration The fields as typed.
 * @returns The message of each field that breaks a rule, in form order; empty when the sign-up can be sent.
 */
export function registerErrors({ displayName, username, email, password, confirm }: Registration): RegisterErrors {
  const typedUsername = username.trim().toLowerCase();
  const typedEmail = email.trim();
  return {
    ...(displayName.trim() === "" && { displayName: REGISTER_MESSAGES.displayName }),
    ...(typedUsername === ""
      ? { username: REGISTER_MESSAGES.username }
      : !USERNAME_PATTERN.test(typedUsername) && { username: REGISTER_MESSAGES.usernameFormat }),
    ...(typedEmail === ""
      ? { email: REGISTER_MESSAGES.email }
      : !z.email().safeParse(typedEmail).success && { email: REGISTER_MESSAGES.emailFormat }),
    ...(password === ""
      ? { password: REGISTER_MESSAGES.password }
      : password.length < PASSWORD_MIN_LENGTH && { password: REGISTER_MESSAGES.passwordShort }),
    ...(confirm === "" ? { confirm: REGISTER_MESSAGES.confirm } : confirm !== password && { confirm: REGISTER_MESSAGES.confirmMismatch }),
  };
}

/**
 * Turns a test user into the session the login keeps, with their initials.
 * @param user The test user.
 * @returns The session user.
 */
function sessionOf({ id, username, displayName }: TestUser): SessionUser {
  return { id, username, displayName, initials: initials(displayName) };
}
