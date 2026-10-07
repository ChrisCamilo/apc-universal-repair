import { expect, test } from "@playwright/test";
import { signIn } from "./session.ts";

// The page starts at night, following a dark system, so turning dark mode off is a change.
test.use({ colorScheme: "dark" });

// Every test here starts on the Dashboard, so a test user is logged in first.
test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.route("**/api/items", (route) => route.fulfill({ json: { items: [] } }));
});

// Opens the user menu and checks the trigger shows the logged user (the username only on desktop), turns dark mode
// off and picks GT4 with the menu staying open, and checks both apply at once and are still there after a reload.
// On the phone, the menu also stays on screen.
test("Web: the user menu changes and keeps the display preferences", async ({ page }, testInfo) => {
  await page.goto("/inventory");
  const trigger = page.getByRole("button", { name: "Menu do usuário" });
  await expect(trigger.getByText("CC")).toBeVisible();
  if (testInfo.project.name === "desktop") {
    await expect(trigger.getByText("christian.camilo")).toBeVisible();
  } else {
    await expect(trigger.getByText("christian.camilo")).toBeHidden();
  }
  await trigger.click();
  const menu = page.getByRole("menu", { name: "Menu do usuário" });
  await expect(menu.getByText("Christian Camilo")).toBeVisible();
  const box = (await menu.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);

  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-mode", "night");
  await page.getByRole("menuitemcheckbox", { name: "Modo escuro" }).click();
  await expect(html).toHaveAttribute("data-mode", "day");
  await page.getByRole("menuitemradio", { name: "GT4" }).click();
  await expect(html).toHaveAttribute("data-style", "gt4");
  await expect(menu).toBeVisible();

  await page.reload();
  await expect(html).toHaveAttribute("data-style", "gt4");
  await expect(html).toHaveAttribute("data-mode", "day");
});
