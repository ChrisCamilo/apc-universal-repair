// Table behavior shared by the web and mobile DataTable: when the web table turns into cards, and which rows stay
// while they fade out, as a row's nested rows do when it closes. How a table sorts is in @apc/domain/list-query.

/** Below this width, in px, the web table turns each row into a card and hides the header. */
export const TABLE_CARD_BREAKPOINT = 720;

/** A row a table shows, and whether it is fading out before it goes. */
export type ShownRow<Row> = { row: Row; leaving: boolean };

/**
 * Lays out the rows a table shows when its rows change: the new rows, and each nested row it showed that is gone
 * while the row it belongs to is still there, as when that row closes, kept in its place and marked as leaving, so it
 * can fade out there. A nested row whose own row went too, as with a search or another page, goes at once.
 * @param shown The rows the table showed, those still leaving included.
 * @param rows The new rows.
 * @param key Reads a row's key.
 * @param nested Whether a row belongs to the row above it, e.g. a brand of an item.
 * @returns The rows to show, in order.
 */
export function shownRows<Row>(
  shown: readonly ShownRow<Row>[],
  rows: readonly Row[],
  key: (row: Row) => string,
  nested: (row: Row) => boolean,
): ShownRow<Row>[] {
  const kept = new Set(rows.map(key));
  const result: ShownRow<Row>[] = rows.map((row) => ({ row, leaving: false }));
  let parent: string | undefined;
  let after = -1;
  for (const { row } of shown) {
    const id = key(row);
    if (!nested(row)) {
      parent = id;
    }
    if (kept.has(id)) {
      after = result.findIndex((each) => !each.leaving && key(each.row) === id);
    } else if (nested(row) && parent !== undefined && kept.has(parent)) {
      after += 1;
      result.splice(after, 0, { row, leaving: true });
    }
  }
  return result;
}
