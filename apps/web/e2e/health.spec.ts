import { expect, test } from "@playwright/test";

test.describe("Home page", () => {
  test("renders the project title", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "APC Universal Repair" })).toBeVisible();
  });

  test("shows the API status", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("health-status")).toContainText("API status:");
  });
});
