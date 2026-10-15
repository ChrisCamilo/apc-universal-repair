import assert from "node:assert/strict";
import { after, afterEach, beforeEach, mock, test } from "node:test";
import { TEST_USERS } from "@apc/shared/test-users";
import { buildApp } from "../app.js";
import { prisma } from "../db/client.js";
import { hashToken } from "../sessions/sessions.js";
import { ATTEMPT_WINDOW_MS } from "../users/attempts.js";

// Wrong logins against a real database (`pnpm --filter @apc/api test:db`), migrated and seeded with the test users.
// Each test builds its own app, so it starts with no attempts counted, and the clock is held so a window can end.

const [USER, OTHER] = TEST_USERS;
/** The tokens of the sessions the tests start, ended at the end. */
const tokens: string[] = [];

beforeEach(() => {
  mock.timers.enable({ apis: ["Date"], now: new Date() });
});

afterEach(() => {
  mock.timers.reset();
});

after(async () => {
  await prisma.session.deleteMany({ where: { tokenHash: { in: tokens.map(hashToken) } } });
  await prisma.$disconnect();
});

/**
 * Logs in, keeping the token of a session it starts.
 * @param app The app.
 * @param username The username.
 * @param password The password.
 * @param remoteAddress Where the login comes from.
 * @returns The answer.
 */
async function login(app: ReturnType<typeof buildApp>, username: string, password: string, remoteAddress = "10.0.0.2") {
  const response = await app.inject({ method: "POST", url: "/sessions", payload: { username, password }, remoteAddress });
  if (response.statusCode === 200) {
    tokens.push(response.json().token);
  }
  return response;
}

// Sends 5 wrong passwords, then the right one, and checks the 6th is refused with 429 and when to try again without
// the password being checked, until the window ends, when the right password logs in.
test("API: 5 wrong logins block the username from that address for the window", async () => {
  const app = buildApp();
  try {
    for (let attempt = 1; attempt <= 5; attempt++) {
      assert.equal((await login(app, USER.username, "errada")).statusCode, 401, `attempt ${attempt}`);
    }
    const blocked = await login(app, USER.username, USER.password);
    assert.equal(blocked.statusCode, 429);
    assert.equal(blocked.headers["retry-after"], String(ATTEMPT_WINDOW_MS / 1000));
    assert.equal(blocked.json().message, "Too many attempts. Try again in 15 min.");
    const unknown = await login(app, USER.username, "outra");
    assert.deepEqual([unknown.statusCode, unknown.json().message], [429, blocked.json().message]);

    mock.timers.tick(ATTEMPT_WINDOW_MS);
    assert.equal((await login(app, USER.username, USER.password)).statusCode, 200);
  } finally {
    await app.close();
  }
});

// Sends 4 wrong passwords and the right one, then 4 wrong ones again, and checks the right one cleared the count, so
// the 5th wrong one is still a 401.
test("API: a right login clears the count of wrong ones", async () => {
  const app = buildApp();
  try {
    for (let attempt = 1; attempt <= 4; attempt++) {
      await login(app, USER.username, "errada");
    }
    assert.equal((await login(app, USER.username, USER.password)).statusCode, 200);
    for (let attempt = 1; attempt <= 4; attempt++) {
      await login(app, USER.username, "errada");
    }
    assert.equal((await login(app, USER.username, "errada")).statusCode, 401);
  } finally {
    await app.close();
  }
});

// Blocks one username with 5 wrong passwords, and checks another username from the same address, or the same one
// from another address, still logs in.
test("API: a blocked username leaves other usernames and addresses alone", async () => {
  const app = buildApp();
  try {
    for (let attempt = 1; attempt <= 5; attempt++) {
      await login(app, USER.username, "errada");
    }
    assert.equal((await login(app, USER.username, USER.password)).statusCode, 429);
    assert.equal((await login(app, OTHER.username, OTHER.password)).statusCode, 200);
    assert.equal((await login(app, USER.username, USER.password, "10.0.0.3")).statusCode, 200);
  } finally {
    await app.close();
  }
});
