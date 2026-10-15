import assert from "node:assert/strict";
import { after, test } from "node:test";
import { REGISTER_MESSAGES } from "@apc/shared/auth";
import { buildApp } from "../app.js";
import { sessionOf } from "./users.js";

// These requests are rejected by validation before any database call, so they run without a database.

const app = buildApp();
// A sign-up with every field fine.
const NEW_USER = { displayName: "Ana Souza", username: "ana.souza", email: "ana@oficina.com", password: "freio1234" };

after(() => app.close());

// Signs up with each field breaking its rule, and checks each is refused naming the field with the form's message,
// and that the password typed never comes back in the answer.
test("API: a sign-up breaking the form's rules is refused per field", async () => {
  const cases = [
    { field: "displayName", value: "  ", message: REGISTER_MESSAGES.displayName },
    { field: "username", value: "a b", message: REGISTER_MESSAGES.usernameFormat },
    { field: "email", value: "ana@", message: REGISTER_MESSAGES.emailFormat },
    { field: "password", value: "curta", message: REGISTER_MESSAGES.passwordShort },
  ];
  for (const { field, value, message } of cases) {
    const response = await app.inject({ method: "POST", url: "/users", payload: { ...NEW_USER, [field]: value } });
    assert.equal(response.statusCode, 400, field);
    assert.deepEqual(response.json().details, [{ field, message }], field);
    assert.ok(!response.body.includes("curta"), field);
  }
});

// Logs in without a username, with only spaces and without a password, and checks each is refused before the
// database is asked.
test("API: a login needs a username and a password", async () => {
  for (const payload of [{ password: "x" }, { username: "  ", password: "x" }, { username: "ana.souza", password: "" }]) {
    const response = await app.inject({ method: "POST", url: "/sessions", payload });
    assert.equal(response.statusCode, 400, JSON.stringify(payload));
  }
});

// Turns a user row into the session, before and after the tutorial was seen, and checks the initials and that only a
// row with a date counts as seen.
test("API: the session says whether the user has seen the Inventory tutorial", () => {
  const row = { id: "u1", username: "ana.souza", displayName: "Ana Souza", inventoryTutorialSeenAt: null };
  assert.deepEqual(sessionOf(row), { id: "u1", username: "ana.souza", displayName: "Ana Souza", initials: "AS", inventoryTutorialSeen: false });
  assert.equal(sessionOf({ ...row, inventoryTutorialSeenAt: new Date() }).inventoryTutorialSeen, true);
});

// Sends 30 logins from one address, none of them valid, and checks the 31st is refused with 429 and when to try
// again, while another address still gets through to validation.
test("API: an address gets 30 logins in 15 minutes", async () => {
  const limited = buildApp();
  try {
    for (let attempt = 1; attempt <= 30; attempt++) {
      const response = await limited.inject({ method: "POST", url: "/sessions", payload: {}, remoteAddress: "10.0.0.2" });
      assert.equal(response.statusCode, 400, `attempt ${attempt}`);
    }
    const refused = await limited.inject({ method: "POST", url: "/sessions", payload: {}, remoteAddress: "10.0.0.2" });
    assert.equal(refused.statusCode, 429);
    assert.equal(refused.headers["retry-after"], "900");
    assert.equal(refused.json().message, "Too many attempts. Try again in 15 min.");
    const other = await limited.inject({ method: "POST", url: "/sessions", payload: {}, remoteAddress: "10.0.0.3" });
    assert.equal(other.statusCode, 400);
  } finally {
    await limited.close();
  }
});

// Sends 10 sign-ups from one address, none of them valid, and checks the 11th is refused with 429, and that the
// logins of that address aren't counted with them.
test("API: an address gets 10 sign-ups in 15 minutes", async () => {
  const limited = buildApp();
  try {
    for (let attempt = 1; attempt <= 10; attempt++) {
      const response = await limited.inject({ method: "POST", url: "/users", payload: {}, remoteAddress: "10.0.0.2" });
      assert.equal(response.statusCode, 400, `attempt ${attempt}`);
    }
    const refused = await limited.inject({ method: "POST", url: "/users", payload: {}, remoteAddress: "10.0.0.2" });
    assert.equal(refused.statusCode, 429);
    assert.ok(Number(refused.headers["retry-after"]) > 0);
    const login = await limited.inject({ method: "POST", url: "/sessions", payload: {}, remoteAddress: "10.0.0.2" });
    assert.equal(login.statusCode, 400);
  } finally {
    await limited.close();
  }
});
