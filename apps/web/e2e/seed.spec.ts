import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/shared/test-tags";
import { dashboard } from "./locators/dashboard.ts";

// The page Playwright's test agents start from (docs/testing.md): the planner explores the app from it, and the
// generator writes each test to start as it does, through the fixtures.

// Opens the app at "/" with a test user logged in and an empty stock, as every web E2E starts, and checks the
// Inventory tab is open.
test("Web: the agents' seed opens the Dashboard with a test user", { tag: [TEST_TAGS.dashboard] }, async ({ page }) => {
  await page.goto("/");
  await expect(dashboard(page).tab("inventory")).toHaveAttribute("aria-selected", "true");
});
