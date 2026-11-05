import assert from "node:assert/strict";
import { test } from "node:test";
import {
  apiFetch,
  createApiAuth,
  createMockAuth,
  initials,
  LOGIN_MESSAGES,
  loginErrors,
  onSessionExpired,
  REGISTER_MESSAGES,
  registerErrors,
  SESSION_STORAGE_KEY,
  tooManyAttempts,
  userCreateSchema,
  waitForDevice,
  type AuthService,
  type Credentials,
  type SessionStore,
  type SessionUser,
} from "./auth.ts";
import { TEST_USERS } from "./testUsers.ts";
import type { DeviceSigner } from "../devices/devices.ts";

const USER = TEST_USERS[0];

// A sign-up as typed, every field fine.
const NEW_USER = { displayName: "Ana Souza", username: "Ana.Souza", email: " ana@oficina.com ", password: "freio1234", confirm: "freio1234" };
// The setup's fetch, put back after each test that stands in for it.
const GLOBAL_FETCH = globalThis.fetch;
// A user as the screens see them.
const SESSION_USER = { id: "u1", username: USER.username, displayName: USER.displayName, initials: "CC", inventoryTutorialSeen: false };
// The same user as the API answers a login with, and the session it saves: the user and the token of their session.
const LOGGED_IN = { ...SESSION_USER, token: "t1" };
// The nonce the API stand-ins hand out on GET /devices/challenge.
const NONCE = "n1";
// A device's key, standing in for the apps': a fixed public key, and a "signature" that names the nonce.
const DEVICE: DeviceSigner = { publicKey: async () => "pk1", sign: async (nonce) => `sig-${nonce}` };
// What the device sends with a login or sign-up for NONCE.
const PROOF = { publicKey: "pk1", nonce: NONCE, signature: `sig-${NONCE}` };

/** A request a stand-in for fetch got. */
type Sent = { url: string; method?: string; body: unknown; authorization?: string };

/**
 * Builds a stand-in for fetch that answers every request with one status and body, and keeps what was sent: the
 * address, the method unless it is a POST, the body, and the token when one was sent. GET /devices/challenge is
 * answered with NONCE, and not kept.
 * @param status The status to answer with.
 * @param body The JSON body to answer with.
 * @returns The stand-in and the requests it got.
 */
function answering(status: number, body: unknown = {}): { send: typeof fetch; sent: Sent[] } {
  const sent: Sent[] = [];
  const send = withChallenge(async (url: string, init?: RequestInit) => {
    const authorization = new Headers(init?.headers).get("Authorization");
    sent.push({
      url,
      ...(init?.method !== "POST" && { method: init?.method }),
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
      ...(authorization && { authorization }),
    });
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  });
  return { send, sent };
}

/**
 * Wraps a stand-in for fetch so it answers GET /devices/challenge with NONCE, as the API does.
 * @param send The stand-in for every other request.
 * @returns The stand-in with the challenge.
 */
function withChallenge(send: (url: string, init?: RequestInit) => Promise<Response>): typeof fetch {
  return (async (url: string, init?: RequestInit) =>
    url.endsWith("/devices/challenge") ? new Response(JSON.stringify({ nonce: NONCE }), { status: 200 }) : send(url, init)) as typeof fetch;
}

/**
 * Builds a device store in memory, like localStorage or AsyncStorage.
 * @returns The store and the map it writes to.
 */
function memoryStore(): { store: SessionStore; saved: Map<string, string> } {
  const saved = new Map<string, string>();
  return {
    saved,
    store: {
      getItem: async (key) => saved.get(key) ?? null,
      setItem: async (key, value) => {
        saved.set(key, value);
      },
      removeItem: async (key) => {
        saved.delete(key);
      },
    },
  };
}

// Leaves each field empty in turn, and checks only the empty ones get their message, in form order.
test("Shared: each empty login field gets its message", () => {
  assert.deepEqual(loginErrors({ username: "", password: "" }), { username: LOGIN_MESSAGES.username, password: LOGIN_MESSAGES.password });
  assert.deepEqual(Object.keys(loginErrors({ username: "", password: "" })), ["username", "password"]);
  assert.deepEqual(loginErrors({ username: "christian.camilo", password: "" }), { password: LOGIN_MESSAGES.password });
  assert.deepEqual(loginErrors({ username: "", password: "opala" }), { username: LOGIN_MESSAGES.username });
  assert.deepEqual(loginErrors({ username: "christian.camilo", password: "opala" }), {});
});

// Types only spaces in each field, and checks a user of spaces counts as empty but a password of spaces doesn't,
// since spaces can be part of a password.
test("Shared: a user of only spaces is empty, a password of spaces is not", () => {
  assert.deepEqual(loginErrors({ username: "   ", password: "   " }), { username: LOGIN_MESSAGES.username });
});

// Logs in as a test user, also typing the user in another case and with spaces around it, and checks the login
// answers with the user and their initials and saves the session on the device.
test("Shared: a test user logs in and the session is saved", async () => {
  const { store, saved } = memoryStore();
  const auth = createMockAuth(store, TEST_USERS, 0);
  const expected = { id: USER.id, username: USER.username, displayName: USER.displayName, initials: initials(USER.displayName), inventoryTutorialSeen: false };
  assert.deepEqual(await auth.login({ username: USER.username, password: USER.password }), expected);
  assert.deepEqual(JSON.parse(saved.get(SESSION_STORAGE_KEY)!), expected);
  assert.deepEqual(await createMockAuth(store, TEST_USERS, 0).login({ username: ` ${USER.username.toUpperCase()} `, password: USER.password }), expected);
});

// Tries a wrong password, an unknown user and the password in another case, and checks each is refused with no
// session saved.
test("Shared: a wrong user or password is refused and saves nothing", async () => {
  const { store, saved } = memoryStore();
  const auth = createMockAuth(store, TEST_USERS, 0);
  assert.equal(await auth.login({ username: USER.username, password: "errada" }), null);
  assert.equal(await auth.login({ username: "fulano", password: USER.password }), null);
  assert.equal(await auth.login({ username: USER.username, password: USER.password.toUpperCase() }), null);
  assert.equal(saved.size, 0);
});

// Logs in, then reads the session back with a new service on the same store, as after a reload, logs out and
// checks nobody is logged in any more.
test("Shared: the session comes back after a reload and ends with logout", async () => {
  const { store } = memoryStore();
  const user = await createMockAuth(store, TEST_USERS, 0).login({ username: USER.username, password: USER.password });
  const reloaded = createMockAuth(store, TEST_USERS, 0);
  assert.deepEqual(await reloaded.currentUser(), user);
  await reloaded.logout();
  assert.equal(await reloaded.currentUser(), null);
});

// Puts something that isn't a session under the session key, broken JSON and an object missing fields, and checks
// both count as nobody logged in.
test("Shared: a saved session that isn't one counts as logged out", async () => {
  const { store } = memoryStore();
  const auth = createMockAuth(store, TEST_USERS, 0);
  await store.setItem(SESSION_STORAGE_KEY, "{not json");
  assert.equal(await auth.currentUser(), null);
  await store.setItem(SESSION_STORAGE_KEY, JSON.stringify({ id: "user-christian" }));
  assert.equal(await auth.currentUser(), null);
});

// Takes the initials of names with two, three and one words, and with extra spaces.
test("Shared: initials take the first letters of the first and last words", () => {
  assert.equal(initials("Christian Camilo"), "CC");
  assert.equal(initials("ana maria  souza"), "AS");
  assert.equal(initials("  Oficina "), "O");
});

// Checks the delay of a login: it answers only once that time has passed, so the screens can show their loading.
test("Shared: the mocked login answers after its delay", async () => {
  const { store } = memoryStore();
  const started = Date.now();
  await createMockAuth(store, TEST_USERS, 50).login({ username: USER.username, password: USER.password });
  assert.ok(Date.now() - started >= 45);
});

// Fills the sign-up with each kind of mistake in turn, and checks each field gets its message in form order, the
// username typed in uppercase is fine, and a sign-up with every field fine has none.
test("Shared: each sign-up field that breaks a rule gets its message", () => {
  assert.deepEqual(registerErrors(NEW_USER), {});
  const empty = registerErrors({ displayName: " ", username: " ", email: "", password: "", confirm: "" });
  assert.deepEqual(empty, {
    displayName: REGISTER_MESSAGES.displayName,
    username: REGISTER_MESSAGES.username,
    email: REGISTER_MESSAGES.email,
    password: REGISTER_MESSAGES.password,
    confirm: REGISTER_MESSAGES.confirm,
  });
  assert.deepEqual(Object.keys(empty), ["displayName", "username", "email", "password", "confirm"]);
  assert.deepEqual(registerErrors({ ...NEW_USER, username: "an" }), { username: REGISTER_MESSAGES.usernameFormat });
  assert.deepEqual(registerErrors({ ...NEW_USER, username: "ana souza" }), { username: REGISTER_MESSAGES.usernameFormat });
  assert.deepEqual(registerErrors({ ...NEW_USER, email: "ana@" }), { email: REGISTER_MESSAGES.emailFormat });
  assert.deepEqual(registerErrors({ ...NEW_USER, password: "curta", confirm: "curta" }), { password: REGISTER_MESSAGES.passwordShort });
  assert.deepEqual(registerErrors({ ...NEW_USER, confirm: "freio12345" }), { confirm: REGISTER_MESSAGES.confirmMismatch });
});

// Reads a sign-up through the API's schema and checks the name and e-mail are trimmed and the username lowercased,
// and that a username, e-mail or password breaking a rule is refused with the form's message.
test("Shared: the API reads a sign-up under the form's rules", () => {
  assert.deepEqual(userCreateSchema.parse(NEW_USER), { displayName: "Ana Souza", username: "ana.souza", email: "ana@oficina.com", password: "freio1234" });
  const wrong = userCreateSchema.safeParse({ ...NEW_USER, username: "a b", email: "ana", password: "curta" });
  assert.ok(!wrong.success);
  assert.deepEqual(
    wrong.error.issues.map((issue) => [issue.path[0], issue.message]),
    [
      ["username", REGISTER_MESSAGES.usernameFormat],
      ["email", REGISTER_MESSAGES.emailFormat],
      ["password", REGISTER_MESSAGES.passwordShort],
    ],
  );
});

// Signs up on the mock, logs out and in again with the new user, and checks a second sign-up with the same username
// in another case is refused as taken, as is a test user's.
test("Shared: the mocked sign-up logs the new user in and refuses a taken username", async () => {
  const { store, saved } = memoryStore();
  const auth = createMockAuth(store, TEST_USERS, 0);
  const created = await auth.register(NEW_USER);
  const user = { id: "user-ana.souza", username: "ana.souza", displayName: "Ana Souza", initials: "AS", inventoryTutorialSeen: false };
  assert.deepEqual(created, { user });
  assert.deepEqual(JSON.parse(saved.get(SESSION_STORAGE_KEY)!), user);
  await auth.logout();
  assert.deepEqual(await auth.login({ username: "ana.souza", password: NEW_USER.password }), user);
  assert.deepEqual(await auth.register({ ...NEW_USER, username: "ANA.SOUZA" }), { refused: REGISTER_MESSAGES.taken });
  assert.deepEqual(await auth.register({ ...NEW_USER, username: USER.username }), { refused: REGISTER_MESSAGES.taken });
});

// Logs in through the API stand-in: an accepted login saves the user it answers with and their token, and answers
// the user without the token; a 401 is refused with nothing saved, and any other answer rejects, so the screen can
// say the login couldn't be made.
test("Shared: the API login saves the user and the token, refuses a 401 and rejects otherwise", async () => {
  const accepted = answering(200, LOGGED_IN);
  const { store, saved } = memoryStore();
  assert.deepEqual(await createApiAuth(store, "/api", DEVICE, accepted.send).login({ username: USER.username, password: USER.password }), SESSION_USER);
  assert.deepEqual(accepted.sent, [{ url: "/api/sessions", body: { username: USER.username, password: USER.password, device: PROOF } }]);
  assert.deepEqual(JSON.parse(saved.get(SESSION_STORAGE_KEY)!), LOGGED_IN);

  const refused = memoryStore();
  assert.equal(await createApiAuth(refused.store, "/api", DEVICE, answering(401).send).login({ username: "x", password: "y" }), null);
  assert.equal(refused.saved.size, 0);
  await assert.rejects(createApiAuth(refused.store, "/api", DEVICE, answering(500).send).login({ username: "x", password: "y" }));
  await assert.rejects(createApiAuth(refused.store, "/api", DEVICE, answering(200, SESSION_USER).send).login({ username: "x", password: "y" }));
});

// Signs up through the API stand-in: a 201 saves the user and the token, a 409 says the username is taken, and a
// failed request or any other answer says the account couldn't be created.
test("Shared: the API sign-up saves the user and the token, or says why it was refused", async () => {
  const created = answering(201, { ...LOGGED_IN, username: "ana.souza", displayName: "Ana Souza", initials: "AS", token: "t2" });
  const { store, saved } = memoryStore();
  const sent = { displayName: NEW_USER.displayName, username: NEW_USER.username, email: NEW_USER.email, password: NEW_USER.password };
  const user = { id: "u1", username: "ana.souza", displayName: "Ana Souza", initials: "AS", inventoryTutorialSeen: false };
  assert.deepEqual(await createApiAuth(store, "/api", DEVICE, created.send).register(sent), { user });
  assert.deepEqual(created.sent, [{ url: "/api/users", body: { ...sent, device: PROOF } }]);
  assert.deepEqual(JSON.parse(saved.get(SESSION_STORAGE_KEY)!), { ...user, token: "t2" });
  assert.deepEqual(await createApiAuth(store, "/api", DEVICE, answering(409).send).register(sent), { refused: REGISTER_MESSAGES.taken });
  assert.deepEqual(await createApiAuth(store, "/api", DEVICE, answering(400).send).register(sent), { refused: REGISTER_MESSAGES.failed });
  const offline = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;
  assert.deepEqual(await createApiAuth(store, "/api", DEVICE, offline).register(sent), { refused: REGISTER_MESSAGES.failed });
});

// Reads a saved session back and marks the tutorial seen through the API stand-in: the saved session says so, keeping
// its token, and the API gets the PUT for the caller with the token; with the API out of reach, the session still
// says so.
test("Shared: the API marks the Inventory tutorial seen for the caller, and on the device even offline", async () => {
  const api = answering(204);
  const { store, saved } = memoryStore();
  saved.set(SESSION_STORAGE_KEY, JSON.stringify(LOGGED_IN));
  const auth = createApiAuth(store, "/api", DEVICE, api.send);
  const user = (await auth.currentUser())!;
  assert.deepEqual(await auth.markInventoryTutorialSeen(user), { ...user, inventoryTutorialSeen: true });
  assert.deepEqual(api.sent, [{ url: "/api/users/me/inventory-tutorial", method: "PUT", body: undefined, authorization: "Bearer t1" }]);
  assert.deepEqual(JSON.parse(saved.get(SESSION_STORAGE_KEY)!), { ...LOGGED_IN, inventoryTutorialSeen: true });

  const offline = memoryStore();
  offline.saved.set(SESSION_STORAGE_KEY, JSON.stringify(LOGGED_IN));
  const unreachable = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;
  assert.equal((await createApiAuth(offline.store, "/api", DEVICE, unreachable).markInventoryTutorialSeen(user)).inventoryTutorialSeen, true);
  assert.equal(JSON.parse(offline.saved.get(SESSION_STORAGE_KEY)!).inventoryTutorialSeen, true);
});

// Builds the AuthService with the address as a function, as the phone does, then moves the server, as a new pairing
// does, and checks each request goes to the address of its moment.
test("Shared: an address given as a function is read at each request", async () => {
  const api = answering(200, LOGGED_IN);
  let server = "https://192.168.0.10:3000";
  const auth = createApiAuth(memoryStore().store, () => server, DEVICE, api.send);
  await auth.login({ username: USER.username, password: USER.password });
  server = "https://192.168.0.11:3000";
  await auth.logout();
  assert.deepEqual(
    api.sent.map(({ url }) => url),
    ["https://192.168.0.10:3000/sessions", "https://192.168.0.11:3000/sessions/current"],
  );
});

// Saves sessions from older versions, one without the tutorial and one without a token, and checks the first counts
// as not having seen it and the one without a token as nobody logged in, so the user logs in again once.
test("Shared: a session saved without a token counts as logged out", async () => {
  const { store, saved } = memoryStore();
  const older = { id: "u1", username: USER.username, displayName: USER.displayName, initials: "CC" };
  saved.set(SESSION_STORAGE_KEY, JSON.stringify({ ...older, token: "t1" }));
  assert.equal((await createApiAuth(store, "/api", DEVICE).currentUser())!.inventoryTutorialSeen, false);
  saved.set(SESSION_STORAGE_KEY, JSON.stringify({ ...older, inventoryTutorialSeen: true }));
  assert.equal(await createApiAuth(store, "/api", DEVICE).currentUser(), null);
});

// Logs in, then logs out through the API stand-in, and checks the logout ends the session on the API with its token,
// clears it on the device, and that calls after it carry no token; with the API out of reach, the device still
// forgets the session.
test("Shared: the API logout ends the session on the API and on the device", async () => {
  const { store, saved } = memoryStore();
  const api = answering(200, LOGGED_IN);
  const auth = createApiAuth(store, "/api", DEVICE, api.send);
  await auth.login({ username: USER.username, password: USER.password });
  await auth.logout();
  assert.deepEqual(api.sent.at(-1), { url: "/api/sessions/current", method: "DELETE", body: undefined, authorization: "Bearer t1" });
  assert.equal(saved.size, 0);
  const after = answering(200, { items: [] });
  globalThis.fetch = after.send;
  try {
    await apiFetch("/api/items");
    assert.deepEqual(after.sent, [{ url: "/api/items", method: undefined, body: undefined }]);
  } finally {
    globalThis.fetch = GLOBAL_FETCH;
  }

  const offline = memoryStore();
  offline.saved.set(SESSION_STORAGE_KEY, JSON.stringify(LOGGED_IN));
  const unreachable = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;
  const offlineAuth = createApiAuth(offline.store, "/api", DEVICE, unreachable);
  await offlineAuth.currentUser();
  await offlineAuth.logout();
  assert.equal(offline.saved.size, 0);
});

// Reads a saved session back and calls the API with apiFetch, keeping the call's own headers, then has the API refuse
// the token, and checks the listeners hear it once, the token is dropped from the next calls, and a 401 to a call
// without a token tells nobody.
test("Shared: API calls carry the token, and a 401 to one ends the session", async () => {
  const { store, saved } = memoryStore();
  saved.set(SESSION_STORAGE_KEY, JSON.stringify(LOGGED_IN));
  await createApiAuth(store, "/api", DEVICE).currentUser();
  let expired = 0;
  const stop = onSessionExpired(() => expired++);
  try {
    const ok = answering(200, { items: [] });
    globalThis.fetch = ok.send;
    await apiFetch("/api/items", { method: "PATCH", headers: { "content-type": "application/json" }, body: "{}" });
    assert.deepEqual(ok.sent, [{ url: "/api/items", method: "PATCH", body: {}, authorization: "Bearer t1" }]);

    const refused = answering(401);
    globalThis.fetch = refused.send;
    assert.equal((await apiFetch("/api/items")).status, 401);
    assert.equal(expired, 1);
    await apiFetch("/api/items");
    assert.deepEqual(refused.sent.at(-1), { url: "/api/items", method: undefined, body: undefined });
    assert.equal(expired, 1);
  } finally {
    stop();
    globalThis.fetch = GLOBAL_FETCH;
  }
});

// Logs a test user in with the mock, marks the tutorial seen, logs out and back in, and checks the second login says
// it was seen while another user's first login still says it wasn't.
test("Shared: the mocked login remembers who has seen the Inventory tutorial", async () => {
  const auth = createMockAuth(memoryStore().store, TEST_USERS, 0);
  const first = (await auth.login({ username: USER.username, password: USER.password })) as SessionUser;
  assert.equal(first.inventoryTutorialSeen, false);
  await auth.markInventoryTutorialSeen(first);
  await auth.logout();
  assert.equal(((await auth.login({ username: USER.username, password: USER.password })) as SessionUser).inventoryTutorialSeen, true);
  const other = TEST_USERS[1];
  assert.equal(((await auth.login({ username: other.username, password: other.password })) as SessionUser).inventoryTutorialSeen, false);
});

// Turns a 429's Retry-After into the message: whole minutes rounded up, at least one, and a minute when it is missing.
test("Shared: too many attempts say how many minutes to wait", () => {
  assert.equal(tooManyAttempts("900"), "Muitas tentativas. Tente de novo em 15 min.");
  assert.equal(tooManyAttempts("61"), "Muitas tentativas. Tente de novo em 2 min.");
  assert.equal(tooManyAttempts("5"), "Muitas tentativas. Tente de novo em 1 min.");
  assert.equal(tooManyAttempts(null), "Muitas tentativas. Tente de novo em 1 min.");
});

// Has the API answer a login and a sign-up with 429, and checks both are refused saying when to try again, with
// nothing saved.
test("Shared: the API login and sign-up say when to try again after too many attempts", async () => {
  const limited = withChallenge(async () => new Response(JSON.stringify({ statusCode: 429 }), { status: 429, headers: { "Retry-After": "840" } }));
  const { store, saved } = memoryStore();
  const auth = createApiAuth(store, "/api", DEVICE, limited);
  const refused = { refused: "Muitas tentativas. Tente de novo em 14 min." };
  assert.deepEqual(await auth.login({ username: USER.username, password: USER.password }), refused);
  const sent = { displayName: NEW_USER.displayName, username: NEW_USER.username, email: NEW_USER.email, password: NEW_USER.password };
  assert.deepEqual(await auth.register(sent), refused);
  assert.equal(saved.size, 0);
});

// Logs in and signs up from a device the server's computer hasn't authorized, which the API answers 403 with its short
// code, and checks each says so with the code and saves nothing; then asks whether it was authorized, with the
// device's proof, and checks the answer, and that a failed answer rejects.
test("Shared: a device waiting for authorization is told so with its code, and asks when it has it", async () => {
  const waiting = answering(403, { statusCode: 403, error: "device_pending", message: "Device not authorized yet.", code: "K7Q2ZD" });
  const { store, saved } = memoryStore();
  const auth = createApiAuth(store, "/api", DEVICE, waiting.send);
  assert.deepEqual(await auth.login({ username: USER.username, password: USER.password }), { pending: "K7Q2ZD" });
  const sent = { displayName: NEW_USER.displayName, username: NEW_USER.username, email: NEW_USER.email, password: NEW_USER.password };
  assert.deepEqual(await auth.register(sent), { pending: "K7Q2ZD" });
  assert.equal(saved.size, 0);

  const status = answering(200, { status: "authorized" });
  assert.equal(await createApiAuth(store, "/api", DEVICE, status.send).deviceStatus(), "authorized");
  assert.deepEqual(status.sent, [{ url: "/api/devices/status", body: PROOF }]);
  await assert.rejects(createApiAuth(store, "/api", DEVICE, answering(500).send).deviceStatus());
  assert.equal(await createMockAuth(store, TEST_USERS, 0).deviceStatus(), "authorized");
});

// Waits for a device the server's computer authorizes on the third ask, the first failing, and checks the login then
// goes through with the credentials typed; then for one that is refused, and one whose wait is stopped.
test("Shared: a waiting device logs in once it is authorized, and stops when refused", async () => {
  const statuses = ["fail", "pending", "authorized"];
  const logins: Credentials[] = [];
  const auth = {
    deviceStatus: async () => {
      const status = statuses.shift();
      if (status === "fail") {
        throw new TypeError("fetch failed");
      }
      return status;
    },
    login: async (credentials: Credentials) => {
      logins.push(credentials);
      return SESSION_USER;
    },
  } as unknown as AuthService;
  const credentials = { username: USER.username, password: USER.password };
  assert.deepEqual(await waitForDevice(auth, credentials, new AbortController().signal, 0), SESSION_USER);
  assert.deepEqual(logins, [credentials]);

  const refused = { deviceStatus: async () => "unknown" } as unknown as AuthService;
  assert.equal(await waitForDevice(refused, credentials, new AbortController().signal, 0), null);
  const stopped = new AbortController();
  stopped.abort();
  assert.equal(await waitForDevice(refused, credentials, stopped.signal, 0), undefined);
});
