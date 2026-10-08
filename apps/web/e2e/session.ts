import type { Page } from "@playwright/test";
import { initials, SESSION_STORAGE_KEY } from "@apc/shared/auth";
import { INVENTORY_TUTORIAL_STORAGE_KEY } from "@apc/shared/inventory-tutorial";
import { TEST_USERS } from "@apc/shared/test-users";

// Logs a test user in before a page loads, as a session saved on a previous visit, for the tests that start on the
// Dashboard, which only a logged user reaches. The Inventory tutorial counts as seen, so it doesn't start by itself
// over the screen a test looks at, unless the test asks for it.

/**
 * Saves a test user's session in the page's localStorage before any of its scripts run, on every load.
 * @param page The test's page.
 * @param tutorialSeen Whether the Inventory tutorial counts as seen; when false, it starts by itself on the first load.
 */
export async function signIn(page: Page, tutorialSeen = true): Promise<void> {
  const { id, username, displayName } = TEST_USERS[0];
  const session = JSON.stringify({ id, username, displayName, initials: initials(displayName) });
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [SESSION_STORAGE_KEY, session] as const);
  if (tutorialSeen) {
    await page.addInitScript((key) => localStorage.setItem(key, "true"), INVENTORY_TUTORIAL_STORAGE_KEY);
  }
}
