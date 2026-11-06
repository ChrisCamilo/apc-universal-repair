import assert from "node:assert/strict";
import { test } from "node:test";
import { isStyleId, STYLE_SCOPES, styleIds } from "./styleIds.ts";

// Gives the slots of a dialog their ids and checks the component's own element takes the component's id, and each
// slot the component's id followed by its path, a dot for each level.
test("Shared: each slot gets the component's id and its path", () => {
  assert.deepEqual(styleIds("common.dialog", { base: "", header: "header", title: "header.title", close: "header.close" }), {
    base: "common.dialog",
    header: "common.dialog.header",
    title: "common.dialog.header.title",
    close: "common.dialog.header.close",
  });
});

// Checks ids written as the convention asks pass, in every scope, and ids with an unknown scope, no component,
// capitals, spaces, underscores or empty levels don't.
test("Shared: style ids are a known scope then kebab-case levels", () => {
  for (const scope of STYLE_SCOPES) {
    assert.equal(isStyleId(`${scope}.some-component.slot-2`), true, scope);
  }
  for (const id of ["common.dialog", "inventory.item-form-dialog.fields.code", "catalog.part-results.part.code"]) {
    assert.equal(isStyleId(id), true, id);
  }
  for (const id of ["ds.dialog", "common", "common.Dialog", "common.item form", "common.item_form", "common..dialog", "common.dialog.", "common.-dialog"]) {
    assert.equal(isStyleId(id), false, id);
  }
});
