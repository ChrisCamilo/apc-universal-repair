import { expect, logIn, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import type { Item } from "@apc/domain/items";
import { NOTEBOOK_WIDTH, NOTEBOOK_WINDOW_HEIGHT } from "@apc/ui-spec/screens";
import { TEST_USERS } from "@apc/domain/test-users";
import { testItem } from "@apc/domain/test-items";
import { dataTable } from "../../web/e2e/locators/common.ts";
import { dashboard } from "../../web/e2e/locators/dashboard.ts";
import { inventory } from "../../web/e2e/locators/inventory.ts";

// The desktop app in a window on a 1360×768 notebook, whose content is about 1360×689 once the taskbar and the title
// bar are taken off: the compiled app on the stand-in API, with enough items to fill more than the window. The web
// E2E check the same layout at that size on Vite's dev server; this checks the production build in Electron's window,
// sized by the window's own content size, as the app ships.

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

test.use({ stubStock: { items: ITEMS } });

// Signs in and sizes the window's content to 1360×689, and checks the page itself doesn't scroll: the header is at
// the top, the toolbar and the pagination are in view, and only the Inventory's table scrolls.
test("Desktop: in a window on a 1360×768 notebook only the Inventory's table scrolls", { tag: [TEST_TAGS.inventory, TEST_TAGS.layout] }, async ({ launchApp }) => {
  const { app } = await launchApp();
  const page = await app.firstWindow();
  await logIn(page, TEST_USERS[0]);
  const { rows, scroll } = dataTable(page);
  await expect(rows.first()).toBeVisible();
  await app.evaluate(({ BrowserWindow }, [width, height]) => BrowserWindow.getAllWindows()[0].setContentSize(width, height), [NOTEBOOK_WIDTH, NOTEBOOK_WINDOW_HEIGHT]);
  await expect.poll(() => page.evaluate(() => innerHeight)).toBeLessThanOrEqual(NOTEBOOK_WINDOW_HEIGHT + 1);

  expect(await page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight)).toBe(0);
  expect((await dashboard(page).header.boundingBox())!.y).toBe(0);
  const { newItem, pager } = inventory(page);
  await expect(newItem).toBeInViewport();
  await expect(pager.pages).toBeInViewport();
  expect(await scroll.evaluate((box) => box.scrollHeight > box.clientHeight)).toBe(true);
});
