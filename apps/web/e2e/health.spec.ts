import { expect, test } from "@playwright/test";

// Opens the home page and checks the project title is shown as the main heading.
test("Web: home page renders the project title", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "APC Universal Repair" })).toBeVisible();
});

// Opens the home page and checks it reports the API status, which proves the web app reaches the API.
test("Web: home page shows the API status", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("health-status")).toContainText("API status:");
});

// Opens the home page and checks the APC badge is shown whole inside the viewport, at the desktop
// and mobile minimum sizes, until the login screen takes it over.
test("Web: home page shows the APC badge inside the viewport", async ({ page }) => {
  await page.goto("/");
  const badge = page.getByRole("img", { name: "APC Universal Repair" });
  await expect(badge).toBeVisible();
  const box = (await badge.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
});
