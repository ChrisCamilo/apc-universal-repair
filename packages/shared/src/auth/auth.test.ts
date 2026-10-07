import assert from "node:assert/strict";
import { test } from "node:test";
import { LOGIN_MESSAGES, loginErrors } from "./auth.ts";

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
