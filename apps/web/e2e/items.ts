import type { Page } from "@playwright/test";
import { matchesSearch, stockStatus, type Item } from "@apc/shared/items";

// A stand-in for GET /items, so the list works the same on every run without a database: it answers from the items
// it is given, newest first as they are listed, narrowed by the search, the categories and the stock status, one page
// at a time when a page size is asked, with how many match in all. Other methods fall through to the test's own
// routes, registered before it.

/**
 * Answers GET /api/items, with or without a query, from a list of items the test may change as it goes.
 * @param page The test's page.
 * @param stock The items in stock, newest first; read on every request.
 * @param onQuery Called with each request's query, to check what the list asked for.
 */
export async function serveItems(page: Page, stock: Item[], onQuery?: (query: URLSearchParams) => void): Promise<void> {
  await page.route(
    (url) => url.pathname === "/api/items",
    (route) => {
      if (route.request().method() !== "GET") {
        return route.fallback();
      }
      const query = new URL(route.request().url()).searchParams;
      onQuery?.(query);
      const categories = query.getAll("category");
      const status = query.get("status");
      const matching = stock.filter(
        (item) =>
          matchesSearch(item, query.get("q") ?? "") &&
          (categories.length === 0 || categories.includes(item.category)) &&
          (!status || stockStatus(item.quantity, item.minQuantity) === status),
      );
      const size = Number(query.get("pageSize")) || matching.length;
      const first = (Number(query.get("page") || 1) - 1) * size;
      return route.fulfill({ json: { items: matching.slice(first, first + size), total: matching.length } });
    },
  );
}
