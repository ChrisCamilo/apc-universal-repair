// Table behavior shared by the web and mobile DataTable: how a header click changes the sort, how rows are
// compared, and the options of the "Sort by" select used where the header is hidden.

/** Below this width, in px, the web table turns each row into a card and hides the header. */
export const TABLE_CARD_BREAKPOINT = 720;

/** A sort on one column, ascending or descending. */
export type Sort = { key: string; dir: "asc" | "desc" };
/** A column that can be sorted, as the "Sort by" select lists it. */
export type SortColumn = { key: string; label: string; numeric?: boolean };

/**
 * Applies a click on a sortable header: the first click sorts ascending, a second click on the same column
 * sorts descending, and a click after that goes back to ascending.
 * @param current Sort in place, or null.
 * @param key Key of the column clicked.
 * @returns The new sort.
 */
export function nextSort(current: Sort | null, key: string): Sort {
  return { key, dir: current?.key === key && current.dir === "asc" ? "desc" : "asc" };
}

/**
 * Reads a sort back from a "Sort by" select value.
 * @param value Value written by sortValue, or "" for no sort.
 * @returns The sort, or null.
 */
export function sortFromValue(value: string): Sort | null {
  const [key, dir] = value.split(":");
  return key ? { key, dir: dir === "desc" ? "desc" : "asc" } : null;
}

/**
 * Lists the options of the "Sort by" select: each column ascending and descending, after the unsorted
 * option, with the value written by sortValue.
 * @param columns Sortable columns, in table order.
 * @param unsortedLabel Label of the option with no sort, e.g. "Ordem de cadastro".
 * @returns Select options, e.g. "Quantidade (menor → maior)".
 */
export function sortOptions(columns: readonly SortColumn[], unsortedLabel: string): { value: string; label: string }[] {
  return [
    { value: "", label: unsortedLabel },
    ...columns.flatMap((column) => [
      { value: sortValue({ key: column.key, dir: "asc" }), label: `${column.label} (${column.numeric ? "menor → maior" : "A → Z"})` },
      { value: sortValue({ key: column.key, dir: "desc" }), label: `${column.label} (${column.numeric ? "maior → menor" : "Z → A"})` },
    ]),
  ];
}

/**
 * Sorts rows by one value, text in pt-BR order with numbers in place ("A-2" before "A-10") and numbers by
 * value; ties keep their order.
 * @param rows Rows in their current order.
 * @param valueOf Reads the value to sort by from a row.
 * @param dir Ascending or descending.
 * @returns A new array in the sorted order.
 */
export function sortRows<Row>(rows: readonly Row[], valueOf: (row: Row) => string | number, dir: Sort["dir"]): Row[] {
  const collator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = valueOf(a);
    const y = valueOf(b);
    return sign * (typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y)));
  });
}

/**
 * Writes a sort as a "Sort by" select value.
 * @param sort Sort in place, or null.
 * @returns E.g. "qty:desc", or "" for no sort.
 */
export function sortValue(sort: Sort | null): string {
  return sort ? `${sort.key}:${sort.dir}` : "";
}
