import { z } from "zod";

// Login shared by the web and mobile apps: which fields must be filled before the login is sent, and the mocked
// login itself. Until the real backend (EP-10), the user and password are checked against the test users kept in
// the repo (@apc/shared/test-users), and the session is saved on the device through the store each app hands over
// (localStorage on the web, AsyncStorage on mobile). The screens only see AuthService, so EP-10 can swap the mock
// for the backend without touching them.

/**
 * Messages of the login form: under each field left empty, above the form when the login is refused, and in the
 * dialog "Esqueceu a senha?" opens while there is no password reset (EP-10).
 */
export const LOGIN_MESSAGES = {
  username: "Informe o usuário.",
  password: "Informe a senha.",
  failed: "Usuário ou senha incorretos.",
  forgotPassword: "Peça ao administrador da oficina para redefinir sua senha.",
} as const;
/** How long the mocked login takes to answer, so the screens show their loading state as with a real server. */
export const MOCK_LOGIN_DELAY_MS = 400;
/** Storage key of the saved session. */
export const SESSION_STORAGE_KEY = "apc-session";
const sessionUserSchema = z.object({ id: z.string(), username: z.string(), displayName: z.string(), initials: z.string() });

/** Logs in and out and tells who is logged in; the mock now, the real backend with EP-10. */
export type AuthService = {
  /** Checks the user and password; resolves with the logged user, or null when they don't match. */
  login: (credentials: Credentials) => Promise<SessionUser | null>;
  /** Ends the session. */
  logout: () => Promise<void>;
  /** The user of the saved session, or null when nobody is logged in. */
  currentUser: () => Promise<SessionUser | null>;
};
/** What the login form sends. */
export type Credentials = { username: string; password: string };
/** The message of each field that can't be sent as it is; a field without one is fine. */
export type LoginErrors = Partial<Record<"username" | "password", string>>;
/** Where the session is saved: the device storage, with the shape of AsyncStorage. */
export type SessionStore = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};
/** The logged user, as the session keeps them. */
export type SessionUser = z.infer<typeof sessionUserSchema>;
/** A test user of the mocked login: who they are and their test password. */
export type TestUser = Omit<SessionUser, "initials"> & { password: string };

/**
 * Builds the mocked login on a device store: the user (ignoring case and surrounding spaces) and the password
 * must match a test user; the session is then saved in the store and read back from it, also after a reload.
 * @param store Where the session is saved on the device.
 * @param users The users who can log in: the repo's test users (@apc/shared/test-users).
 * @param delayMs How long a login takes to answer.
 * @returns The mocked AuthService.
 */
export function createMockAuth(store: SessionStore, users: readonly TestUser[], delayMs = MOCK_LOGIN_DELAY_MS): AuthService {
  return {
    login: async ({ username, password }) => {
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      const user = users.find((test) => test.username === username.trim().toLowerCase() && test.password === password);
      if (!user) {
        return null;
      }
      const session: SessionUser = { id: user.id, username: user.username, displayName: user.displayName, initials: initials(user.displayName) };
      await store.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      return session;
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
