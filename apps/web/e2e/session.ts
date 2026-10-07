import type { Page } from "@playwright/test";
import { initials, SESSION_STORAGE_KEY } from "@apc/shared/auth";
import { TEST_USERS } from "@apc/shared/test-users";

// Logs a test user in before a page loads, as a session saved on a previous visit, for the tests that start on the
// Dashboard, which only a logged user reaches.

/**
 * Saves a test user's session in the page's localStorage before any of its scripts run, on every load.
 * @param page The test's page.
 */
export async function signIn(page: Page): Promise<void> {
  const { id, username, displayName } = TEST_USERS[0];
  const session = JSON.stringify({ id, username, displayName, initials: initials(displayName) });
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [SESSION_STORAGE_KEY, session] as const);
}
