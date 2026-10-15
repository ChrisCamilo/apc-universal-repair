import assert from "node:assert/strict";
import { after, test } from "node:test";
import { buildApp } from "../app.js";
import { bearerToken, hashToken, signedPhotoPath, validPhotoSignature } from "./sessions.js";
import { AUTHORIZED, TEST_SESSION, TEST_SESSIONS } from "./testSessions.js";

// The session check answers before any database call, from the stand-in session, so these run without a database.

const app = buildApp({ sessions: TEST_SESSIONS });
// A request to each route behind a session, with a body that passes validation where one is needed.
const PROTECTED = [
  { method: "GET", url: "/items" },
  { method: "POST", url: "/items/import", payload: { items: [] } },
  { method: "DELETE", url: "/items/00000000-0000-4000-8000-000000000001" },
  { method: "GET", url: "/categories" },
  { method: "POST", url: "/part-brands", payload: { name: "Bosch" } },
  { method: "PUT", url: "/items/00000000-0000-4000-8000-000000000001/photos" },
  { method: "DELETE", url: "/sessions/current" },
  { method: "PUT", url: "/users/me/inventory-tutorial" },
  { method: "GET", url: "/unknown" },
] as const;

after(() => app.close());

// Reads the token of a bearer header, and checks a missing header, another scheme and a token with spaces or
// characters a token never has give none.
test("API: only a bearer header carries a token", () => {
  assert.equal(bearerToken("Bearer abc_DEF-123"), "abc_DEF-123");
  for (const header of [undefined, "", "Bearer", "Bearer ", "Basic abc", "bearer abc", "Bearer a b", "Bearer a.b"]) {
    assert.equal(bearerToken(header), undefined, String(header));
  }
});

// Hashes a token twice and another once, and checks the hash is the same hex SHA-256 each time, never the token.
test("API: a token is kept as its SHA-256", () => {
  assert.match(hashToken("abc"), /^[0-9a-f]{64}$/);
  assert.equal(hashToken("abc"), hashToken("abc"));
  assert.notEqual(hashToken("abc"), hashToken("abd"));
});

// Signs a photo for the session, and checks the signature is accepted for that file and session only, and refused
// when changed, cut short or empty.
test("API: a photo signature holds for its file and session only", () => {
  const signature = new URL(signedPhotoPath(TEST_SESSION, "p1.webp"), "http://api").searchParams.get("signature")!;
  assert.equal(validPhotoSignature(TEST_SESSION, "p1.webp", signature), true);
  assert.equal(validPhotoSignature(TEST_SESSION, "p1-thumb.webp", signature), false);
  assert.equal(validPhotoSignature({ ...TEST_SESSION, tokenHash: hashToken("other") }, "p1.webp", signature), false);
  const changed = `${signature.slice(0, -1)}${signature.endsWith("A") ? "B" : "A"}`;
  assert.equal(validPhotoSignature(TEST_SESSION, "p1.webp", changed), false);
  assert.equal(validPhotoSignature(TEST_SESSION, "p1.webp", signature.slice(1)), false);
  assert.equal(validPhotoSignature(TEST_SESSION, "p1.webp", ""), false);
});

// Calls every route behind a session, and an unknown path, without a token, with another scheme, and with a token
// of no session, and checks each is refused with 401 before its body or the database is looked at.
test("API: every route but the open ones needs a session's token", async () => {
  for (const headers of [{}, { authorization: "Basic dGVzdA==" }, { authorization: "Bearer not-a-session" }]) {
    for (const request of PROTECTED) {
      const response = await app.inject({ ...request, headers });
      assert.equal(response.statusCode, 401, `${request.method} ${request.url} ${JSON.stringify(headers)}`);
      assert.equal(response.json().message, "Log in to use the API.");
    }
  }
});

// Calls the health check, the login and the sign-up without a token, and checks each answers as it would with one:
// the health check is up, and a login or sign-up missing its fields is refused by validation, not for the session.
test("API: the health check, the login and the sign-up are open without a session", async () => {
  assert.equal((await app.inject({ method: "GET", url: "/health" })).statusCode, 200);
  assert.equal((await app.inject({ method: "POST", url: "/sessions", payload: {} })).statusCode, 400);
  assert.equal((await app.inject({ method: "POST", url: "/users", payload: {} })).statusCode, 400);
});

// Sends the stand-in session's token to a route that validates before the database, and checks it goes on to
// the route, which refuses the body.
test("API: a session's token lets the request through to the route", async () => {
  const response = await app.inject({ method: "POST", url: "/items/import", payload: { items: [] }, headers: AUTHORIZED });
  assert.equal(response.statusCode, 400);
});
