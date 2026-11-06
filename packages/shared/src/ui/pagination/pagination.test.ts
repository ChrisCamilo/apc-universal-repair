import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_PAGE_SLOTS, pageCount, pageForSize, pageRange, pageSlots } from "./pagination.ts";

// Counts the pages of a few list sizes and checks a partial last page counts and an empty list has one page.
test("Shared: a list fills whole pages plus a partial last one", () => {
  assert.equal(pageCount(64, 25), 3);
  assert.equal(pageCount(50, 25), 2);
  assert.equal(pageCount(0, 25), 1);
});

// Lists the slots of a short list and of a long one with the current page at the start, the middle and the
// end, and checks every page shows when they fit, the first and last pages and the current one's neighbors
// always show, and the list never passes seven slots.
test("Shared: page slots skip ranges with an ellipsis in at most seven slots", () => {
  assert.deepEqual(pageSlots(1, 1), [1]);
  assert.deepEqual(pageSlots(3, 7), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(pageSlots(1, 10), [1, 2, 3, 4, 5, null, 10]);
  assert.deepEqual(pageSlots(4, 10), [1, 2, 3, 4, 5, null, 10]);
  assert.deepEqual(pageSlots(5, 10), [1, null, 4, 5, 6, null, 10]);
  assert.deepEqual(pageSlots(7, 10), [1, null, 6, 7, 8, 9, 10]);
  assert.deepEqual(pageSlots(10, 10), [1, null, 6, 7, 8, 9, 10]);
  for (let page = 1; page <= 40; page++) {
    const slots = pageSlots(page, 40);
    assert.equal(slots.length, MAX_PAGE_SLOTS);
    assert.ok([1, 40, page - 1, page, page + 1].filter((n) => n >= 1 && n <= 40).every((n) => slots.includes(n)));
  }
});

// Checks no ellipsis stands for a single page, which would take the same room as the page's own button.
test("Shared: an ellipsis always skips two pages or more", () => {
  for (let pages = 8; pages <= 12; pages++) {
    for (let page = 1; page <= pages; page++) {
      const slots = pageSlots(page, pages);
      slots.forEach((slot, i) => {
        if (slot === null) {
          assert.ok((slots[i + 1] as number) - (slots[i - 1] as number) > 2, `page ${page} of ${pages}`);
        }
      });
    }
  }
});

// Writes the range of the first, a middle and the last page, and checks the last one stops at the total,
// numbers take the pt-BR thousands separator, and an empty list reads "0 de 0".
test("Shared: the range shows the items on the page out of the total", () => {
  assert.equal(pageRange(1, 25, 64), "1–25 de 64");
  assert.equal(pageRange(3, 25, 64), "51–64 de 64");
  assert.equal(pageRange(11, 100, 1234), "1.001–1.100 de 1.234");
  assert.equal(pageRange(1, 25, 0), "0 de 0");
});

// Changes the page size on a few pages and checks the new page still holds the first item that was showing.
test("Shared: changing the page size keeps the first item in view", () => {
  assert.equal(pageForSize(3, 25, 50), 2);
  assert.equal(pageForSize(2, 50, 25), 3);
  assert.equal(pageForSize(4, 25, 100), 1);
  assert.equal(pageForSize(1, 100, 25), 1);
});
