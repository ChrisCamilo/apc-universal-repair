import assert from "node:assert/strict";
import { test } from "node:test";
import { createMockAuth, initials, LOGIN_MESSAGES, loginErrors, SESSION_STORAGE_KEY, type SessionStore } from "./auth.ts";
import { TEST_USERS } from "./testUsers.ts";

const USER = TEST_USERS[0];

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
  const expected = { id: USER.id, username: USER.username, displayName: USER.displayName, initials: initials(USER.displayName) };
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
