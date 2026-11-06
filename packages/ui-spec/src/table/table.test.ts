import assert from "node:assert/strict";
import { test } from "node:test";
import { shownRows, type ShownRow } from "./table.ts";

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
