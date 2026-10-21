import type { Page } from "@playwright/test";
import {
  matchesSearch,
  NOT_APPLICABLE,
  optionKey,
  sortableOf,
  sortItems,
  stockStatus,
  type Item,
  type ItemCreate,
  type ItemSortKey,
} from "@apc/shared/items";
import {
  findEntry,
  isCatalogBrand,
  ITEM_LIST_FIELDS,
  ITEM_LIST_PATHS,
  itemsUsing,
  listName,
  withEntry,
  withoutEntry,
  type ItemListKind,
  type ListEntry,
} from "@apc/shared/lists";
import { itemListsOf } from "@apc/shared/test-lists";

// A stand-in for GET /items, so the list works the same on every run without a database: it answers from the items
// it is given, newest first as they are listed or sorted by a column as the API sorts, narrowed by the search, the
// categories and the stock status, one page at a time when a page size is asked, with how many match in all. Other methods fall through to the test's own
// routes, registered before it. The item lists are answered too, starting with what the items use: a POST creates
// a name, or gives back the one a list already holds; a PATCH renames an entry and the items using it, refusing a
// name another entry has; a merge moves an entry's items to another and removes it (a category or part brand; brands
// and models aren't merged here); a DELETE removes an entry no item uses, refusing one in use or a brand of the
// catalog. A part brand is a name of each brand of an item. savedItem answers a create or edit as the API would.

/**
 * Answers GET /api/items, with or without a query, from a list of items the test may change as it goes, and the
 * item lists, from the items there at first.
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
      const sort = query.get("sort") as ItemSortKey | null;
      const sorted = sort
        ? sortItems(
            matching.map((item) => ({ ...sortableOf(item), item })),
            { key: sort, dir: query.get("order") === "desc" ? "desc" : "asc" },
          ).map((row) => row.item)
        : matching;
      const size = Number(query.get("pageSize")) || matching.length;
      const first = (Number(query.get("page") || 1) - 1) * size;
      return route.fulfill({ json: { items: sorted.slice(first, first + size), total: matching.length } });
    },
  );

  const lists = itemListsOf(stock);
  const kindOf = (url: URL) =>
    (Object.keys(ITEM_LIST_PATHS) as ItemListKind[]).find((kind) => url.pathname === `/api${ITEM_LIST_PATHS[kind]}`);
  await page.route(
    (url) => kindOf(url) !== undefined,
    (route) => {
      const kind = kindOf(new URL(route.request().url()))!;
      const list: ListEntry[] = lists[kind];
      if (route.request().method() !== "POST") {
        return route.fulfill({ json: list });
      }
      const sent = route.request().postDataJSON();
      const held = findEntry(
        list.filter((entry) => !sent.vehicleBrandId || ("vehicleBrandId" in entry && entry.vehicleBrandId === sent.vehicleBrandId)),
        sent.name,
      );
      if (held) {
        return route.fulfill({ json: held });
      }
      const created = { id: crypto.randomUUID(), name: listName(sent.name), ...(sent.vehicleBrandId && { vehicleBrandId: sent.vehicleBrandId }) };
      list.push(created);
      return route.fulfill({ status: 201, json: created });
    },
  );

  const entryOf = (url: URL) => {
    const kind = (Object.keys(ITEM_LIST_PATHS) as ItemListKind[]).find((each) => url.pathname.startsWith(`/api${ITEM_LIST_PATHS[each]}/`));
    const id = url.pathname.replace(/\/merge$/, "").split("/").at(-1);
    const entry = kind && (lists[kind] as ListEntry[]).find((held) => held.id === id);
    return kind && entry ? { kind, entry } : undefined;
  };
  await page.route(
    (url) => entryOf(url) !== undefined,
    (route) => {
      const { kind, entry } = entryOf(new URL(route.request().url()))!;
      const conflict = { status: 409, json: { statusCode: 409, error: "Conflict", message: "Conflict." } };
      if (route.request().method() === "DELETE") {
        if (itemsUsing(stock, kind, entry, lists) > 0 || (kind === "vehicleBrands" && isCatalogBrand(entry.name))) {
          return route.fulfill(conflict);
        }
        Object.assign(lists, withoutEntry(lists, kind, entry.id));
        return route.fulfill({ status: 204 });
      }
      if (route.request().url().endsWith("/merge")) {
        const into = (lists[kind] as ListEntry[]).find((held) => held.id === route.request().postDataJSON().into)!;
        const field = ITEM_LIST_FIELDS[kind];
        let moved = 0;
        // Each item moved is replaced, leaving the test's own item objects as they were.
        stock.forEach((item, index) => {
          const renamed = withName(item, field, entry.name, into.name);
          if (renamed !== item) {
            stock[index] = renamed;
            moved += 1;
          }
        });
        Object.assign(lists, withoutEntry(lists, kind, entry.id));
        return route.fulfill({ json: { moved } });
      }
      const name = listName(route.request().postDataJSON().name);
      const siblings = (lists[kind] as ListEntry[]).filter(
        (held) => !("vehicleBrandId" in entry) || ("vehicleBrandId" in held && held.vehicleBrandId === entry.vehicleBrandId),
      );
      if (findEntry(siblings, name) && findEntry(siblings, name)!.id !== entry.id) {
        return route.fulfill(conflict);
      }
      const field = ITEM_LIST_FIELDS[kind];
      const brand = "vehicleBrandId" in entry ? lists.vehicleBrands.find((held) => held.id === entry.vehicleBrandId) : undefined;
      // Each item renamed is replaced, leaving the test's own item objects as they were.
      stock.forEach((item, index) => {
        if (!brand || optionKey(item.vehicleBrand) === optionKey(brand.name)) {
          stock[index] = withName(item, field, entry.name, name);
        }
      });
      const renamed = { ...entry, name };
      Object.assign(lists, withEntry(lists, kind, renamed));
      return route.fulfill({ json: renamed });
    },
  );
}

/**
 * Answers a create or an edit as the API would: the item with the fields sent, its brands as sent (a kept one with its
 * photos, a new one with an id), its original codes as sent, or kept, its codes in uppercase and its quantity the
 * brands' sum.
 * @param sent The body sent.
 * @param held The item before an edit; none for a new one.
 * @returns The item saved.
 */
export function savedItem(sent: Partial<ItemCreate>, held?: Item): Item {
  const brands = sent.brands
    ? sent.brands.map((brand) => ({
        id: brand.id ?? crypto.randomUUID(),
        partBrand: brand.partBrand,
        code: brand.code.trim().toUpperCase(),
        color: brand.color || NOT_APPLICABLE,
        location: brand.location || null,
        quantity: brand.quantity ?? 0,
        unitPriceCents: brand.unitPriceCents,
        photos: held?.brands.find((each) => each.id === brand.id)?.photos ?? [],
      }))
    : held!.brands;
  const now = new Date().toISOString();
  return {
    id: held?.id ?? crypto.randomUUID(),
    name: sent.name ?? held!.name,
    category: sent.category ?? held!.category,
    vehicleBrand: sent.vehicleBrand ?? held!.vehicleBrand,
    vehicleModel: sent.vehicleModel === undefined ? (held?.vehicleModel ?? null) : sent.vehicleModel || null,
    position: sent.position ?? held?.position ?? NOT_APPLICABLE,
    side: sent.side ?? held?.side ?? NOT_APPLICABLE,
    minQuantity: sent.minQuantity ?? held?.minQuantity ?? 0,
    originalCodes: (sent.originalCodes ?? held?.originalCodes ?? []).map((code) => code.trim().toUpperCase()),
    quantity: brands.reduce((sum, brand) => sum + brand.quantity, 0),
    brands,
    createdAt: held?.createdAt ?? now,
    updatedAt: now,
  };
}

/**
 * Renames an entry of the lists in an item: its category, vehicle brand or model, or the part brand of its brands.
 * @param item The item.
 * @param field The item field the entry's list fills.
 * @param from The entry's name.
 * @param to Its new name.
 * @returns A new item with the name changed, or the same item when it doesn't use the entry.
 */
function withName(item: Item, field: (typeof ITEM_LIST_FIELDS)[ItemListKind], from: string, to: string): Item {
  if (field === "partBrand") {
    const uses = item.brands.some((brand) => optionKey(brand.partBrand) === optionKey(from));
    return uses
      ? { ...item, brands: item.brands.map((brand) => (optionKey(brand.partBrand) === optionKey(from) ? { ...brand, partBrand: to } : brand)) }
      : item;
  }
  return optionKey(item[field] ?? "") === optionKey(from) ? { ...item, [field]: to } : item;
}
