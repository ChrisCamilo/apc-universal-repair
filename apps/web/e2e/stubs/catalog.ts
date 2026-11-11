import type { Page } from "@playwright/test";
import { CATALOG_PATH } from "@apc/domain/catalog";
import { applyCatalogChange, catalogChangeOf, TEST_CATALOG_DATA } from "@apc/domain/test-catalog";

// A stand-in for the catalog's routes, so the Catalog tab works the same on every run without a database: GET answers
// the catalog a new server starts with, and the changes (a brand or a node added, renamed, moved or deleted) are made on
// a copy of it kept for the test, under the API's rules (applyCatalogChange), each answering the whole catalog, or 404
// or 409 as the API does.

/**
 * Answers the catalog's routes under /api/catalog from a copy of the test catalog, which the test's changes change.
 * @param page The test's page.
 */
export async function serveCatalog(page: Page): Promise<void> {
  let catalog = structuredClone(TEST_CATALOG_DATA);
  await page.route(
    (url) => url.pathname.startsWith(`/api${CATALOG_PATH}`),
    (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname.slice(`/api${CATALOG_PATH}`.length);
      if (request.method() === "GET" && path === "") {
        return route.fulfill({ json: catalog });
      }
      const made = catalogChangeOf(request.method(), path, request.postDataJSON() ?? {}, crypto.randomUUID());
      if (!made) {
        return route.fallback();
      }
      const result = applyCatalogChange(catalog, made.change);
      if (result === "missing" || result === "taken") {
        const status = result === "missing" ? 404 : 409;
        return route.fulfill({ status, json: { statusCode: status, message: result } });
      }
      catalog = result;
      return route.fulfill({ status: made.status, json: catalog });
    },
  );
}
