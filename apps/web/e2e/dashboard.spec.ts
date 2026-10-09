import { expect, test } from "@playwright/test";
import { DASHBOARD_TABS } from "@apc/shared/tabs";
import { signIn } from "./session.ts";

// The first tab still being built, if any.
const WIP_TAB = DASHBOARD_TABS.find((tab) => tab.wip);

// Every test here starts on the Dashboard, so a test user is logged in first.
test.beforeEach(async ({ page }) => {
  await signIn(page);
});

// Opens the app at "/" and checks it lands on the Inventory tab at /inventory: the APC mark heads the page,
// the tab is selected and its content shows, and nothing scrolls sideways.
test("Web: the Dashboard opens on the Inventory tab", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/inventory$/);
  await expect(page.getByRole("heading", { name: "APC Universal Repair" })).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Seções do Dashboard" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Estoque" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Estoque" })).toBeVisible();

  const mark = (await page.getByRole("img", { name: "APC Universal Repair" }).boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(mark.x).toBeGreaterThanOrEqual(0);
  expect(mark.x + mark.width).toBeLessThanOrEqual(viewport.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
});

// Opens a tab by its link and another by its tab, an unknown path and "/" with the last tab and with a stale saved
// tab, and checks each lands on a real tab, and that the open tab is remembered.
test("Web: tabs have their own routes and the last one is remembered", async ({ page }) => {
  await page.goto("/inventory");
  await expect(page.getByRole("tab", { name: "Estoque" })).toHaveAttribute("aria-selected", "true");
  expect(await page.evaluate(() => localStorage.getItem("apc-tab"))).toBe("inventory");

  await page.getByRole("tab", { name: "Catálogo" }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("apc-tab"))).toBe("catalog");
  await page.goto("/");
  await expect(page).toHaveURL(/\/catalog$/);

  await page.goto("/nao-existe");
  await expect(page).toHaveURL(/\/catalog$/);
  // the Dashboard saves the open tab once it is drawn, after the session is read; wait for it before replacing it
  await expect(page.getByRole("tab", { name: "Catálogo" })).toHaveAttribute("aria-selected", "true");

  await page.evaluate(() => localStorage.setItem("apc-tab", "specs"));
  await page.goto("/");
  await expect(page).toHaveURL(/\/inventory$/);
});

// Makes the page long, scrolls it and checks the header stays pinned to the top on desktop but scrolls away
// with the page at phone width, where it would otherwise take too much of the screen.
test("Web: the header is pinned on desktop and scrolls on phones", async ({ page }, testInfo) => {
  await page.goto("/inventory");
  // the Dashboard is drawn once the saved session is read
  await expect(page.getByRole("main")).toBeVisible();
  await page.evaluate(() => {
    const filler = document.createElement("div");
    filler.style.height = "3000px";
    document.querySelector("main")!.append(filler);
  });
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);

  const header = (await page.locator("header").boundingBox())!;
  if (testInfo.project.name === "desktop") {
    expect(header.y).toBe(0);
  } else {
    expect(header.y + header.height).toBeLessThan(0);
  }
});

// Checks the content frame clips only sideways, so menus and dropdowns can drop below it.
test("Web: the content frame clips only horizontally", async ({ page }) => {
  await page.goto("/inventory");
  const main = page.locator("main");
  await expect(main).toHaveCSS("overflow-x", "clip");
  await expect(main).toHaveCSS("overflow-y", "visible");
});

// Opens the tab still being built and checks it shows the cone and is read out as "em construção", and that its
// screen sits blurred and out of reach behind the notice naming it, with nothing scrolling sideways.
test("Web: a tab still being built opens behind the work-in-progress notice", async ({ page }) => {
  test.skip(!WIP_TAB, "No tab is being built");
  await page.goto("/inventory");
  const tab = page.getByRole("tab", { name: `${WIP_TAB!.label}, em construção` });
  await expect(tab.getByTestId("common.tabs.tab.wip")).toBeVisible();
  await tab.click();
  await expect(page.getByRole("heading", { name: `A aba ${WIP_TAB!.label} ainda não está pronta` })).toBeVisible();
  await expect(page.getByTestId("common.work-in-progress.content")).toHaveJSProperty("inert", true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
