import type { Page } from "@playwright/test";
import { CATALOG_PATH } from "@apc/domain/catalog";
import { TEST_CATALOG_DATA } from "@apc/domain/test-catalog";

// A stand-in for GET /catalog, so the Catalog tab works the same on every run without a database: it answers with the
// catalog a new server starts with.

/**
 * Answers GET /api/catalog with the test catalog.
 * @param page The test's page.
 */
export async function serveCatalog(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname === `/api${CATALOG_PATH}`,
    (route) => (route.request().method() === "GET" ? route.fulfill({ json: TEST_CATALOG_DATA }) : route.fallback()),
  );
}
