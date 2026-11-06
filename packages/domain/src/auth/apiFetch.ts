// The apps' calls to the API: each one carries the token of the session on this device, as "Authorization: Bearer
// <token>". A 401 to a call that carried the token means the session is over, expired or ended on the server, so the
// token is dropped and the apps are told, to clear the saved session and go back to the login. The AuthService on the
// API (createApiAuth) hands the token over when a session starts or is read back from the device, and drops it on
// logout. Calls made while nobody is logged in go out as they are.

/** The session on this device: its token, and who to tell when the API refuses it. */
const SESSION = { token: null as string | null, onExpired: new Set<() => void>() };

/**
 * Calls the API with the global fetch, carrying the session's token.
 * @param input The address, e.g. "/api/items".
 * @param init The request, as fetch takes it.
 * @returns The API's answer.
 */
export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return withSession((address, request) => fetch(address, request))(input, init);
}

/**
 * Listens for the API refusing the session's token.
 * @param listener Called once each time it does.
 * @returns A function that stops listening.
 */
export function onSessionExpired(listener: () => void): () => void {
  SESSION.onExpired.add(listener);
  return () => {
    SESSION.onExpired.delete(listener);
  };
}

/**
 * Takes the token of the session that started or was read back, or null after a logout.
 * @param token The session's token.
 */
export function setSessionToken(token: string | null): void {
  SESSION.token = token;
}

/**
 * Wraps how requests are sent so each one carries the session's token, and a 401 to one ends the session.
 * @param send How requests are sent: the global fetch, or a stand-in in tests.
 * @returns The same, carrying the token.
 */
export function withSession(send: typeof fetch): typeof fetch {
  return async (input, init) => {
    const token = SESSION.token;
    if (!token) {
      return send(input, init);
    }
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    const response = await send(input, { ...init, headers });
    // Only the token sent is dropped: a session started meanwhile stays.
    if (response.status === 401 && SESSION.token === token) {
      SESSION.token = null;
      SESSION.onExpired.forEach((listener) => listener());
    }
    return response;
  };
}
