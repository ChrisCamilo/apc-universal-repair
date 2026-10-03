import { expect, test } from "@playwright/test";

// Calls the API through the web app's /api proxy and checks it answers healthy, which proves the web app
// reaches the API.
test("Web: the web app reaches the API", async ({ page }) => {
  const response = await page.request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({ status: "ok" });
});
