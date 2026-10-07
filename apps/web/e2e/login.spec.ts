import { expect, test } from "@playwright/test";

// Opens /login and checks the badge heads the page with both fields and "Entrar" on screen, laid out without
// sideways scroll, beside the form on desktop and above it on a phone.
test("Web: the login screen shows the badge and the form", async ({ page }, testInfo) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "APC Universal Repair" })).toBeVisible();
  await expect(page.getByLabel("Usuário")).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeInViewport();
  const mark = (await page.getByRole("img", { name: "APC Universal Repair" }).boundingBox())!;
  const field = (await page.getByLabel("Usuário").boundingBox())!;
  if (testInfo.project.name === "desktop") {
    expect(field.x).toBeGreaterThan(mark.x + mark.width);
  } else {
    expect(field.y).toBeGreaterThan(mark.y + mark.height);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
});

// Sends the login empty, then fills it in and presses Enter, and checks the empty fields get their messages with
// the cursor on the user, and the filled-in login goes on to the Dashboard.
test("Web: the login checks empty fields and goes on to the Dashboard", async ({ page }) => {
  await page.route("**/api/items", (route) => route.fulfill({ json: { items: [] } }));
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Informe o usuário.")).toBeVisible();
  await expect(page.getByText("Informe a senha.")).toBeVisible();
  await expect(page.getByLabel("Usuário")).toBeFocused();

  await page.getByLabel("Usuário").fill("christian.camilo");
  await expect(page.getByText("Informe o usuário.")).toBeHidden();
  await page.getByLabel("Senha", { exact: true }).fill("opala4100");
  await page.getByLabel("Senha", { exact: true }).press("Enter");
  await expect(page).toHaveURL(/\/inventory$/);
  await expect(page.getByRole("tab", { name: "Estoque" })).toHaveAttribute("aria-selected", "true");
});
