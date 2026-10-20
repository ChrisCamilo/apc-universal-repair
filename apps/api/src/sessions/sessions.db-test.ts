import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, test } from "node:test";
import { TEST_USERS } from "@apc/shared/test-users";
import { buildApp } from "../app.js";
import { prisma } from "../db/client.js";
import { hashToken } from "./sessions.js";

// Sessions against a real database (`pnpm --filter @apc/api test:db`), migrated and seeded with the test users, as
// CI's migrations job builds one. Not for the database in use: each test adds sessions and users, and removes them.

const app = buildApp();
const USER = TEST_USERS[0];
/** The users the tests sign up, removed at the end with their sessions. */
const signedUp: string[] = [];

after(async () => {
  await prisma.user.deleteMany({ where: { id: { in: signedUp } } });
  await app.close();
  await prisma.$disconnect();
});

/**
 * Logs the first test user in.
 * @returns The token the login answered.
 */
async function login(): Promise<string> {
  const response = await app.inject({ method: "POST", url: "/sessions", payload: { username: USER.username, password: USER.password } });
  assert.equal(response.statusCode, 200);
  return response.json().token;
}

/**
 * Builds the headers of a request with a token.
 * @param token The session's token.
 * @returns The Authorization header.
 */
function bearer(token: string) {
  return { authorization: `Bearer ${token}` };
}

// Logs in and checks the answer carries the user and a token, the database keeps only the token's hash, and the
// token opens a route behind a session.
test("API: a login answers a token the database keeps only as a hash", async () => {
  const token = await login();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  const row = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  assert.equal(row?.user.username, USER.username);
  assert.equal(await prisma.session.count({ where: { tokenHash: token } }), 0);
  assert.equal((await app.inject({ method: "GET", url: "/items", headers: bearer(token) })).statusCode, 200);
  await prisma.session.delete({ where: { id: row!.id } });
});

// Signs up a new user and checks the answer carries a token that opens the API, and that marking the tutorial seen
// marks it for that user, whoever else is logged in.
test("API: a sign-up answers a token, and the tutorial is marked for the caller", async () => {
  const username = `teste.${randomBytes(4).toString("hex")}`;
  const created = await app.inject({
    method: "POST",
    url: "/users",
    payload: { displayName: "Teste Sessão", username, email: `${username}@apc.test`, password: "freio1234" },
  });
  assert.equal(created.statusCode, 201);
  const { id, token, inventoryTutorialSeen } = created.json();
  signedUp.push(id);
  assert.equal(inventoryTutorialSeen, false);
  const marked = await app.inject({ method: "PUT", url: "/users/me/inventory-tutorial", headers: bearer(token) });
  assert.equal(marked.statusCode, 204);
  assert.notEqual((await prisma.user.findUnique({ where: { id } }))?.inventoryTutorialSeenAt, null);
});

// Logs in, logs out with the token, and checks the logout answers 204 and the token and its signed photo paths stop
// working, while another session of the same user goes on.
test("API: logging out ends that session only", async () => {
  const token = await login();
  const other = await login();
  const { id } = (await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } }))!;
  const photo = `/photos/00000000-0000-4000-8000-000000000001.webp?session=${id}&signature=x`;

  assert.equal((await app.inject({ method: "DELETE", url: "/sessions/current", headers: bearer(token) })).statusCode, 204);
  assert.equal((await app.inject({ method: "GET", url: "/items", headers: bearer(token) })).statusCode, 401);
  assert.equal((await app.inject({ method: "GET", url: photo })).statusCode, 401);
  assert.equal(await prisma.session.count({ where: { id } }), 0);
  assert.equal((await app.inject({ method: "GET", url: "/items", headers: bearer(other) })).statusCode, 200);
  await app.inject({ method: "DELETE", url: "/sessions/current", headers: bearer(other) });
});

// Ages a session past its expiry and checks its token is refused with 401 and the session is deleted.
test("API: an expired session's token is refused", async () => {
  const token = await login();
  await prisma.session.update({ where: { tokenHash: hashToken(token) }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await app.inject({ method: "GET", url: "/items", headers: bearer(token) })).statusCode, 401);
  assert.equal(await prisma.session.count({ where: { tokenHash: hashToken(token) } }), 0);
});

// Sets a session's last use two hours back and checks a request moves it, and its expiry, forward to now, while one
// used a minute ago is left as it is.
test("API: a request keeps a session alive, writing its last use once an hour", async () => {
  const token = await login();
  const where = { tokenHash: hashToken(token) };
  const old = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await prisma.session.update({ where, data: { lastUsedAt: old, expiresAt: new Date(old.getTime() + 24 * 60 * 60 * 1000) } });
  await app.inject({ method: "GET", url: "/categories", headers: bearer(token) });
  const touched = (await prisma.session.findUnique({ where }))!;
  assert.ok(Date.now() - touched.lastUsedAt.getTime() < 60 * 1000);
  assert.ok(touched.expiresAt.getTime() - Date.now() > 6 * 24 * 60 * 60 * 1000);

  const recent = new Date(Date.now() - 60 * 1000);
  await prisma.session.update({ where, data: { lastUsedAt: recent } });
  await app.inject({ method: "GET", url: "/categories", headers: bearer(token) });
  assert.equal((await prisma.session.findUnique({ where }))!.lastUsedAt.getTime(), recent.getTime());
  await prisma.session.deleteMany({ where });
});

// Gives a seeded item a photo whose files aren't stored, lists the items with a token, and checks the photo's paths
// are signed for that session: the API accepts them, answering 404 for the missing file, not 401.
test("API: the items' photo paths are signed for the caller's session", async () => {
  const token = await login();
  const { id } = (await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } }))!;
  const brand = (await prisma.itemBrand.findFirst({ where: { photos: { none: {} } } }))!;
  const photoId = "00000000-0000-4000-8000-0000000000db";
  await prisma.itemPhoto.create({ data: { id: photoId, brandId: brand.id, position: 0, file: `${photoId}.webp`, thumbFile: `${photoId}-thumb.webp` } });
  try {
    const listed = await app.inject({ method: "GET", url: `/items?q=${encodeURIComponent(brand.code)}`, headers: bearer(token) });
    const [photo] = listed.json().items[0].brands.find((each: { id: string }) => each.id === brand.id).photos;
    for (const path of [photo.url, photo.thumbUrl]) {
      assert.equal(new URL(path, "http://api").searchParams.get("session"), id, path);
      assert.equal((await app.inject({ method: "GET", url: path })).statusCode, 404, path);
    }
  } finally {
    await prisma.itemPhoto.delete({ where: { id: photoId } });
    await app.inject({ method: "DELETE", url: "/sessions/current", headers: bearer(token) });
  }
});
