import { mkdtempSync } from "node:fs";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, expect, test } from "@playwright/test";
import { TEST_TAGS } from "@apc/shared/test-tags";
import type { Item } from "@apc/shared/items";
import { NOTEBOOK_WIDTH, NOTEBOOK_WINDOW_HEIGHT } from "@apc/shared/screens";
import { TEST_USERS } from "@apc/shared/test-users";
import { reduceMotion } from "./reducedMotion.ts";
import { startStubApi } from "./stubApi.ts";
import { testItem } from "@apc/shared/test-items";

// The desktop app in a window on a 1360×768 notebook, whose content is about 1360×689 once the taskbar and the title
// bar are taken off: the compiled app (dist/main.js) with the web build, on a stand-in API with enough items to fill
// more than the window. Run `pnpm --filter @apc/web build` and `pnpm run build` first, as for the smoke test.

/** The desktop app's folder, which Electron opens as the app. */
const APP_DIR = path.join(import.meta.dirname, "..");
/** Items enough to fill the list past the window. */
const ITEMS: Item[] = Array.from({ length: 40 }, (_, index) =>
  testItem({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    code: `P-${index + 1}`,
    name: `Peça ${index + 1}`,
    category: "Motor",
    partBrand: "Mann",
    vehicleBrand: "Volkswagen",
    vehicleModel: null,
    position: "N/A",
    side: "N/A",
    color: "N/A",
    location: null,
    quantity: 5,
    minQuantity: 1,
    unitPriceCents: 3990,
    photos: [],
    createdAt: "2026-10-03T12:00:00.000Z",
    updatedAt: "2026-10-03T12:00:00.000Z",
  }),
);

let api: { server: Server; url: string };

test.beforeAll(async () => {
  api = await startStubApi(ITEMS);
});

test.afterAll(async () => {
  await new Promise((resolve) => api.server.close(resolve));
});

// Signs in and sizes the window's content to 1360×689, and checks the page itself doesn't scroll: the header is at
// the top, the toolbar and the pagination are in view, and only the Inventory's table scrolls.
test("Desktop: in a window on a 1360×768 notebook only the Inventory's table scrolls", { tag: [TEST_TAGS.inventory, TEST_TAGS.layout] }, async () => {
  const env: Record<string, string> = { ...(process.env as Record<string, string>), APC_API_URL: api.url, APC_USER_DATA: mkdtempSync(path.join(tmpdir(), "apc-desktop-")) };
  // With it set, Electron runs as plain Node instead of opening the app.
  delete env.ELECTRON_RUN_AS_NODE;
  const app = reduceMotion(await electron.launch({ args: [APP_DIR], env }));
  try {
    const page = await app.firstWindow();
    await page.getByLabel("Usuário", { exact: true }).fill(TEST_USERS[0].username);
    await page.getByLabel("Senha", { exact: true }).fill(TEST_USERS[0].password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await app.evaluate(({ BrowserWindow }, [width, height]) => BrowserWindow.getAllWindows()[0].setContentSize(width, height), [NOTEBOOK_WIDTH, NOTEBOOK_WINDOW_HEIGHT]);
    await expect.poll(() => page.evaluate(() => innerHeight)).toBeLessThanOrEqual(NOTEBOOK_WINDOW_HEIGHT + 1);

    expect(await page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight)).toBe(0);
    expect((await page.locator("header").boundingBox())!.y).toBe(0);
    await expect(page.getByRole("button", { name: "Novo item" })).toBeInViewport();
    await expect(page.getByRole("navigation", { name: "Páginas do estoque" })).toBeInViewport();
    const table = page.getByTestId("common.data-table.scroll");
    expect(await table.evaluate((box) => box.scrollHeight > box.clientHeight)).toBe(true);
  } finally {
    await app.close();
  }
});
