import { test as base, type Page } from "@playwright/test";
import type { TestUser } from "@apc/domain/auth";
import type { Item } from "@apc/domain/items";
import { serveCatalog } from "../stubs/catalog.ts";
import { serveItems } from "../stubs/items.ts";
import { signIn } from "../stubs/session.ts";
import { serveUsers } from "../stubs/users.ts";
import { expect } from "./expect.ts";

// The web E2E's own test: every spec imports test and expect from here instead of @playwright/test. Each page starts
// with a test user logged in, the items of the spec's stock and the users' stand-in, and answers any other API call
// itself, with a 501 that fails the test, so a test never reaches whatever API listens on port 3333.
//
// Playwright tries the routes registered last first. The page's are registered in this order, so the last one
// listed is tried first:
//   1. the guard, for every /api/** call, tried after everything else;
//   2. the session's tutorial route, the catalog's stand-in, and the items' stand-in for the stock;
//   3. the users' stand-in;
//   4. the test's own routes, and any stand-in it starts itself (serveItems with its own items), in its order.
// A test that opens another page in the same browser guards it the same way (guardApi), with its own stand-ins: an
// unanswered call there would reach that API, and its 401 would end the session the pages share.
//
// Playwright names a fixture's second argument `use`; it is `provide` here, as the React hooks lint rule takes any
// call to `use` for React's hook.

type Options = {
  /** Whether a test user is logged in before the page loads; false for the screens before the login. */
  signedIn: boolean;
  /**
   * The items GET /api/items answers with at first, copied for each test; none by default. They are in an object, as
   * Playwright reads an array given to test.use() as a fixture's value and its options.
   */
  stock: { items: Item[] };
};

type Fixtures = {
  /** The users the users' stand-in knows, the test users first; read it to check a sign-up. */
  users: TestUser[];
};

/**
 * Answers every /api/** call no stand-in answers with a 501, so the page never reaches the API on port 3333, and keeps
 * which calls those were. Stand-ins registered after it are tried first.
 * @param page The page to guard.
 * @returns The calls left unanswered, as "METHOD /path", filled in as the page makes them.
 */
export async function guardApi(page: Page): Promise<string[]> {
  const unanswered: string[] = [];
  await page.route("**/api/**", (route) => {
    const { pathname } = new URL(route.request().url());
    unanswered.push(`${route.request().method()} ${pathname}`);
    return route.fulfill({ status: 501, json: { statusCode: 501, message: "No stand-in answers this call." } });
  });
  return unanswered;
}

export const test = base.extend<Options & Fixtures>({
  signedIn: [true, { option: true }],
  stock: [{ items: [] }, { option: true }],
  page: async ({ page, signedIn, stock }, provide) => {
    const unanswered = await guardApi(page);
    if (signedIn) {
      await signIn(page);
    }
    await serveCatalog(page);
    await serveItems(page, [...stock.items]);
    await provide(page);
    expect(unanswered, "API calls no stand-in answered").toEqual([]);
  },
  users: [async ({ page }, provide) => provide(await serveUsers(page)), { auto: true }],
});

export { expect };
