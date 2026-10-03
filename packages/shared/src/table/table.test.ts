import assert from "node:assert/strict";
import { test } from "node:test";
import { nextSort, sortFromValue, sortOptions, sortRows, sortValue } from "./table.ts";

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
