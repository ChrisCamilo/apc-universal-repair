import assert from "node:assert/strict";
import { after, test } from "node:test";
import { REGISTER_MESSAGES } from "@apc/shared/auth";
import { buildApp } from "../app.js";

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
