// Paging shared by the web and mobile Pagination: how many pages a list has, which page buttons show, the
// range text and the page that keeps the same items in view when the page size changes.

/** Most slots the page list takes, buttons and ellipses together; longer lists skip ranges with an ellipsis. */
export const MAX_PAGE_SLOTS = 7;
/** Page sizes the inventory offers; the first is the default. */
export const PAGE_SIZES = [25, 50, 100] as const;
/** localStorage (web) and AsyncStorage (mobile) key of the default page size, "Itens por página" in the user menu. */
export const PAGE_SIZE_STORAGE_KEY = "apc-page-size";

/**
 * Counts the pages a list fills; an empty list still has one page.
 * @param total Number of items in the list.
 * @param pageSize Items per page.
 * @returns Number of pages, at least 1.
 */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * Picks the page that keeps the first item of the current page in view after the page size changes.
 * @param page Current page, from 1.
 * @param pageSize Current items per page.
 * @param nextSize New items per page.
 * @returns The page holding that item at the new size.
 */
export function pageForSize(page: number, pageSize: number, nextSize: number): number {
  return Math.floor(((page - 1) * pageSize) / nextSize) + 1;
}

/**
 * Writes which items the page shows out of the whole list, in pt-BR.
 * @param page Current page, from 1.
 * @param pageSize Items per page.
 * @param total Number of items in the list.
 * @returns E.g. "1–25 de 64", or "0 de 0" for an empty list.
 */
export function pageRange(page: number, pageSize: number, total: number): string {
  const format = new Intl.NumberFormat("pt-BR");
  if (total === 0) {
    return "0 de 0";
  }
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return `${format.format(first)}–${format.format(last)} de ${format.format(total)}`;
}

/**
 * Lists the page buttons in at most seven slots: every page when they fit, otherwise the first page, the last
 * page and the neighbors of the current one, with an ellipsis (null) for each skipped range. An ellipsis
 * always stands for two pages or more, and the list keeps the same length as the current page moves.
 * @param page Current page, from 1.
 * @param pages Number of pages.
 * @returns Page numbers in order, with null where the ellipsis goes, e.g. [1, null, 4, 5, 6, null, 10].
 */
export function pageSlots(page: number, pages: number): (number | null)[] {
  const run = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  if (pages <= MAX_PAGE_SLOTS) {
    return run(1, pages);
  }
  // Pages shown beside the first or the last one when the current page is near that end.
  const edge = MAX_PAGE_SLOTS - 2;
  if (page < edge) {
    return [...run(1, edge), null, pages];
  }
  if (page > pages - edge + 1) {
    return [1, null, ...run(pages - edge + 1, pages)];
  }
  return [1, null, page - 1, page, page + 1, null, pages];
}
