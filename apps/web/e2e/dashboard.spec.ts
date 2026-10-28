import { expect, test } from "./support/fixtures.ts";
import { NOTEBOOK_HEIGHT, NOTEBOOK_WIDTH, NOTEBOOK_WINDOW_HEIGHT } from "@apc/shared/screens";
import { DASHBOARD_TABS } from "@apc/shared/tabs";

// The first tab still being built, if any.
const WIP_TAB = DASHBOARD_TABS.find((tab) => tab.wip);

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
  await expect(page).not.toScrollSideways();
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

// Makes the content far taller than the window and scrolls over it, and checks the page itself never scrolls: the
// header stays at the top, in view, and the content scrolls inside its frame instead, never sideways.
test("Web: the page never scrolls and the header stays in view", async ({ page }) => {
  await page.goto("/inventory");
  // the Dashboard is drawn once the saved session is read
  await expect(page.getByRole("main")).toBeVisible();
  await page.evaluate(() => {
    const filler = document.createElement("div");
    filler.style.height = "3000px";
    filler.style.flexShrink = "0";
    document.querySelector("main")!.append(filler);
  });
  await page.mouse.move(100, 400);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.locator("main").evaluate((main) => main.scrollTop)).toBeGreaterThan(500);

  expect(await page.evaluate(() => [window.scrollY, document.scrollingElement!.scrollHeight - window.innerHeight])).toEqual([0, 0]);
  expect((await page.locator("header").boundingBox())!.y).toBe(0);
  await expect(page.locator("main")).toHaveCSS("overflow-x", "hidden");
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
  await expect(page).not.toScrollSideways();
});

// On a 1360×768 notebook, in full screen and in a window (1360×689), opens the Catalog tab and checks the page itself
// doesn't scroll, down or sideways, with the header at the top.
test("Web: on a 1360×768 notebook the Catalog tab doesn't scroll the page", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "A desktop screen");
  await page.goto("/catalog");
  await expect(page.getByRole("tab", { name: /Catálogo/ })).toHaveAttribute("aria-selected", "true");
  for (const height of [NOTEBOOK_HEIGHT, NOTEBOOK_WINDOW_HEIGHT]) {
    await page.setViewportSize({ width: NOTEBOOK_WIDTH, height });
    await expect.poll(() => page.evaluate(() => innerHeight)).toBe(height);
    expect(await page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight), `1360×${height}`).toBe(0);
    await expect(page, `1360×${height}`).not.toScrollSideways();
    expect((await page.locator("header").boundingBox())!.y, `1360×${height}`).toBe(0);
  }
});
