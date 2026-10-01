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
