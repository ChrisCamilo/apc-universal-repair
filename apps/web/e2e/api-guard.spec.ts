import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/shared/test-tags";

// Calls an API route no stand-in answers and checks the guard answers it with a 501 instead of the real API, and fails
// the test once it ends: it is marked as failing, so the run reports it failed only if the guard let the call through.
test("Web: an API call no stand-in answers fails the test", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  test.fail();
  await page.goto("/inventory");
  const status = await page.evaluate(() => fetch("/api/no-stand-in").then((response) => response.status));
  expect(status).toBe(501);
});
