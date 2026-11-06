import assert from "node:assert/strict";
import { test } from "node:test";
import { nextSort, shownRows, sortFromValue, sortOptions, sortRows, sortValue, type ShownRow } from "./table.ts";

// Closes an item of two brands between two others, and checks its brands stay under it, in order, marked as
// leaving; opening it again brings them back as they were, and one still leaving when another item closes stays too.
test("Shared: a closed row's nested rows stay in place while they fade out", () => {
  const nested = (row: string) => row.includes("/");
  const plain = (rows: string[]): ShownRow<string>[] => rows.map((row) => ({ row, leaving: false }));
  const open = plain(["a", "b", "b/1", "b/2", "c", "c/1"]);
  const closed = shownRows(open, ["a", "b", "c", "c/1"], String, nested);
  assert.deepEqual(closed, [
    { row: "a", leaving: false },
    { row: "b", leaving: false },
    { row: "b/1", leaving: true },
    { row: "b/2", leaving: true },
    { row: "c", leaving: false },
    { row: "c/1", leaving: false },
  ]);
  assert.deepEqual(shownRows(closed, ["a", "b", "b/1", "b/2", "c", "c/1"], String, nested), open);
  assert.deepEqual(shownRows(closed, ["a", "b", "c"], String, nested), [...closed.slice(0, 5), { row: "c/1", leaving: true }]);
});

// Searches so an open item goes with its brands, and pages to other rows, and checks nothing is kept: only the rows
// of a row still there fade out.
test("Shared: nested rows go at once with their own row", () => {
  const nested = (row: string) => row.includes("/");
  const open: ShownRow<string>[] = ["a", "b", "b/1"].map((row) => ({ row, leaving: false }));
  assert.deepEqual(shownRows(open, ["a"], String, nested), [{ row: "a", leaving: false }]);
  assert.deepEqual(shownRows(open, ["x", "y"], String, nested), [
    { row: "x", leaving: false },
    { row: "y", leaving: false },
  ]);
});

// Clicks one header three times and another once, and checks ascending, descending, ascending again, and
// that a new column always starts ascending.
test("Shared: header clicks sort ascending, then descending", () => {
  const first = nextSort(null, "qty");
  assert.deepEqual(first, { key: "qty", dir: "asc" });
  const second = nextSort(first, "qty");
  assert.deepEqual(second, { key: "qty", dir: "desc" });
  assert.deepEqual(nextSort(second, "qty"), { key: "qty", dir: "asc" });
  assert.deepEqual(nextSort(second, "name"), { key: "name", dir: "asc" });
});

// Sorts shelf codes and prices and checks text follows pt-BR order with numbers in place, numbers sort by
// value, and descending reverses it.
test("Shared: rows sort text naturally and numbers by value", () => {
  const rows = [{ loc: "A-10", price: 89.9 }, { loc: "a-2", price: 189.9 }, { loc: "Á-1", price: 9.5 }];
  assert.deepEqual(sortRows(rows, (r) => r.loc, "asc").map((r) => r.loc), ["Á-1", "a-2", "A-10"]);
  assert.deepEqual(sortRows(rows, (r) => r.price, "desc").map((r) => r.price), [189.9, 89.9, 9.5]);
  assert.equal(rows[0].loc, "A-10");
});

// Lists the "Sort by" options and checks the unsorted option comes first, each column has both directions
// in words that fit text or numbers, and every value reads back as the same sort.
test("Shared: the sort select lists both directions of each column", () => {
  const options = sortOptions([{ key: "name", label: "Item" }, { key: "qty", label: "Quantidade", numeric: true }], "Ordem de cadastro");
  assert.deepEqual(
    options.map((o) => o.label),
    ["Ordem de cadastro", "Item (A → Z)", "Item (Z → A)", "Quantidade (menor → maior)", "Quantidade (maior → menor)"],
  );
  assert.equal(sortFromValue(options[0].value), null);
  assert.deepEqual(sortFromValue(options[4].value), { key: "qty", dir: "desc" });
  assert.equal(sortValue(sortFromValue(options[1].value)), options[1].value);
});
