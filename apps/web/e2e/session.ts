import type { Page } from "@playwright/test";
import { initials, SESSION_STORAGE_KEY } from "@apc/shared/auth";
import { TEST_USERS } from "@apc/shared/test-users";

// Logs a test user in before a page loads, as a session saved on a previous visit, for the tests that start on the
// Dashboard, which only a logged user reaches. The user has seen the Inventory tutorial, so it doesn't start by itself
// over the screen a test looks at, unless the test asks for it; marking it seen is answered without the API.

/**
 * Saves a test user's session in the page's localStorage before any of its scripts run, and answers marking the
 * tutorial seen. A user who has seen the tutorial is saved on every load; one who hasn't, only on the first load (also
 * over a session saved before it in the same test), since the tutorial then starts and the app marks it seen.
 * @param page The test's page.
 * @param tutorialSeen Whether the user has seen the Inventory tutorial; when false, it starts by itself.
 */
export async function signIn(page: Page, tutorialSeen = true): Promise<void> {
  const { id, username, displayName } = TEST_USERS[0];
  const session = JSON.stringify({ id, username, displayName, initials: initials(displayName), inventoryTutorialSeen: tutorialSeen });
  await page.addInitScript(
    ([key, value, firstLoadOnly]) => {
      if (!firstLoadOnly) {
        localStorage.setItem(key, value);
      } else if (!sessionStorage.getItem(key)) {
        localStorage.setItem(key, value);
        sessionStorage.setItem(key, "saved before the tutorial");
      }
    },
    [SESSION_STORAGE_KEY, session, !tutorialSeen] as const,
  );
  await page.route("**/api/users/*/inventory-tutorial", (route) => route.fulfill({ status: 204 }));
}
