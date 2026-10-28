import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/shared/test-tags";

// Calls the API through the web app's /api proxy and checks it answers healthy, which proves the web app
// reaches the API.
test("Web: the web app reaches the API", { tag: [TEST_TAGS.setup, TEST_TAGS.smoke] }, async ({ page }) => {
  const response = await page.request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({ status: "ok" });
});
