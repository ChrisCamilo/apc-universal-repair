import type { Page } from "@playwright/test";
import { credentialsSchema, initials, userCreateSchema, type TestUser } from "@apc/shared/auth";
import { TEST_USERS } from "@apc/shared/test-users";

// A stand-in for the API's sign-up and login, so they work the same on every run without a database: it knows the
// test users, as the seed puts them in the database, and the users the test signs up. POST /api/users creates a user
// under the form's rules, refusing a username in use (409); POST /api/sessions checks a username and password,
// answering 401 when they don't match. Both answer with the user as the session keeps them, saying whether they have
// seen the Inventory tutorial, and the token "token-<id>", by which PUT /api/users/me/inventory-tutorial marks it
// for the caller and DELETE /api/sessions/current ends the session.

/**
 * Answers POST /api/users, POST /api/sessions, PUT /api/users/me/inventory-tutorial and DELETE /api/sessions/current
 * from the test users and the users signed up meanwhile.
 * @param page The test's page.
 * @returns The users the stand-in knows, the test users first; read it to check a sign-up.
 */
export async function serveUsers(page: Page): Promise<TestUser[]> {
  const users: TestUser[] = [...TEST_USERS];
  // The users who have seen the Inventory tutorial, by id.
  const seen = new Set<string>();
  const session = ({ id, username, displayName }: TestUser) => ({
    id,
    username,
    displayName,
    initials: initials(displayName),
    inventoryTutorialSeen: seen.has(id),
    token: `token-${id}`,
  });
  await page.route("**/api/users", (route) => {
    const parsed = userCreateSchema.safeParse(route.request().postDataJSON());
    if (!parsed.success) {
      return route.fulfill({ status: 400, json: { statusCode: 400, message: "One or more fields failed validation." } });
    }
    const { username, displayName, password } = parsed.data;
    if (users.some((user) => user.username === username)) {
      return route.fulfill({ status: 409, json: { statusCode: 409, message: `Username "${username}" is already taken.` } });
    }
    const user = { id: `user-${username}`, username, displayName, password };
    users.push(user);
    return route.fulfill({ status: 201, json: session(user) });
  });
  await page.route("**/api/sessions", (route) => {
    const { username, password } = credentialsSchema.parse(route.request().postDataJSON());
    const user = users.find((known) => known.username === username && known.password === password);
    return user
      ? route.fulfill({ status: 200, json: session(user) })
      : route.fulfill({ status: 401, json: { statusCode: 401, message: "Wrong username or password." } });
  });
  await page.route("**/api/users/me/inventory-tutorial", async (route) => {
    seen.add((await route.request().headerValue("authorization"))!.replace("Bearer token-", ""));
    return route.fulfill({ status: 204 });
  });
  await page.route("**/api/sessions/current", (route) => route.fulfill({ status: 204 }));
  return users;
}
