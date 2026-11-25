import assert from "node:assert/strict";
import { test } from "node:test";
import { LOGIN_MESSAGES, REGISTER_MESSAGES, tooManyAttempts } from "../../auth/auth.ts";
import { belowNode, brandSummary, CATALOG_TAKEN, partFit, periodOutsideMessage, readEngineFields } from "../../catalog/catalog.ts";
import { TEST_CATALOG } from "../../catalog/testCatalog.ts";
import { DEVICE_MESSAGES } from "../../devices/devices.ts";
import { INVENTORY_TUTORIAL_PARTS } from "../../inventory/inventoryTutorial.ts";
import { CSV_MESSAGES, exportScope, importedSummary } from "../../inventory/itemCsv.ts";
import { FILTER_LABELS, ITEM_SORT_OPTIONS } from "../../inventory/itemFilters.ts";
import { codeTakenMessage, ITEM_FORM_MESSAGES, photoPickerTexts, positionSideText } from "../../inventory/itemForm.ts";
import { itemCardCode, resultSummary, STOCK_STATUS_LABELS } from "../../inventory/items.ts";
import { catalogDeleteNote, ITEM_LIST_TEXTS } from "../../inventory/lists.ts";
import { mercadoLivreSummary } from "../../inventory/mercadoLivreCsv.ts";
import { photoCount, takePhotos } from "../../inventory/photos.ts";
import { CONFLICT_MESSAGES } from "../../sync/conflicts.ts";
import { copyNotice } from "../../sync/copy.ts";
import { INVENTORY_NEEDS_SERVER } from "../../sync/queue.ts";
import { sortOptions } from "../query/listQuery.ts";

// Each feature's catalog in English: its messages built with values, singular and plural, so the English half can't
// fall behind the Portuguese one unnoticed. The Portuguese half is checked by each feature's own tests.

// Builds the login's and the sign-up's messages, and the wait after too many attempts, in English.
test("Shared: the login and the sign-up speak English", () => {
  assert.equal(LOGIN_MESSAGES["en-US"].failed, "Wrong username or password.");
  assert.equal(REGISTER_MESSAGES["en-US"].passwordShort, "The password needs at least 8 characters.");
  assert.deepEqual([tooManyAttempts("60", "en-US"), tooManyAttempts("900", "en-US")], ["Too many attempts. Try again in 1 min.", "Too many attempts. Try again in 15 min."]);
  assert.equal(DEVICE_MESSAGES["en-US"].approveTitle, "Authorize this device?");
});

// Builds the catalog's summaries, refusals and fits in English, one and many.
test("Shared: the catalog speaks English", () => {
  const [brand] = TEST_CATALOG.brands;
  assert.match(brandSummary(TEST_CATALOG, brand, "en-US"), /^\d+ models? · (no sheet yet|1 sheet|\d+ sheets)$/);
  assert.equal(belowNode({ id: "m", label: "Opala", level: "model", children: [{ id: "g", label: "1ª", level: "generation", children: [] }] }, "en-US"), "1 generation");
  assert.equal(periodOutsideMessage({ firstYear: 2019, lastYear: null }, "en-US"), "The period has to stay within the generation's years: from 2019 on.");
  assert.equal(CATALOG_TAKEN["en-US"].year, "This version already has this period.");
  assert.deepEqual(readEngineFields({ litres: "", cylinders: "", drive: "", summary: "" }, "en-US"), {
    problems: { litres: "Use a displacement from 0.1 to 15.0 L.", cylinders: "Use 1 to 16 cylinders.", drive: "Choose the drive." },
  });
  assert.equal(partFit(TEST_CATALOG, { vehicleBrand: "Universal", vehicleModel: null } as never, "en-US"), "Fits any vehicle");
});

// Builds the items' labels, cards and counter in English.
test("Shared: the items speak English", () => {
  assert.equal(STOCK_STATUS_LABELS["en-US"].out, "Out of stock");
  assert.equal(itemCardCode({ brands: [{ code: "620 3001 00", partBrand: "Luk" }, { code: "X", partBrand: "Sachs" }] }, "en-US"), "620 3001 00 · 2 brands");
  const stock = [{ quantity: 1, minQuantity: 2 }, { quantity: 0, minQuantity: 0 }, { quantity: 5, minQuantity: 1 }];
  assert.equal(resultSummary(2, stock, "en-US"), "2 of 3 items · 1 low · 1 out of stock");
  assert.equal(resultSummary(1, [stock[2]], "en-US"), "1 of 1 item · 0 low · 0 out of stock");
});

// Builds the item form's messages and texts in English.
test("Shared: the item form speaks English", () => {
  assert.equal(ITEM_FORM_MESSAGES["en-US"].quantityTooHigh, "Enter 1,000,000 at most.");
  assert.equal(codeTakenMessage("Filtro de óleo", "en-US"), "Code already used in “Filtro de óleo”.");
  assert.equal(positionSideText({ position: "D", side: "LD" }, "en-US"), "Front · Right side");
  assert.deepEqual(photoPickerTexts(1, 3, "en-US"), { count: "1 of 3 photos chosen", use: "Use 1 photo" });
  assert.deepEqual(photoPickerTexts(3, 3, "en-US"), { count: "3 of 3 photos chosen: uncheck one to swap it.", use: "Use 3 photos" });
});

// Builds the filters' labels and the sorts in English.
test("Shared: the filters and the sorts speak English", () => {
  assert.equal(FILTER_LABELS["en-US"].vehicleModel, "Vehicle model");
  assert.equal(ITEM_SORT_OPTIONS["en-US"][0].label, "Order added");
  assert.deepEqual(
    sortOptions([{ key: "price", label: "Unit price", numeric: true }], "Order added", "en-US").map((option) => option.label),
    ["Order added", "Unit price (low → high)", "Unit price (high → low)"],
  );
});

// Builds the CSV's and Mercado Livre's messages in English; the files keep their Portuguese columns.
test("Shared: the import and the exports speak English", () => {
  assert.equal(CSV_MESSAGES["en-US"].rows(1, 2), "1 item ready to import · 2 rows with errors");
  assert.equal(importedSummary({ created: 3, updated: 1 }, "en-US"), "Import done: 3 items created, 1 updated.");
  assert.deepEqual([exportScope(1, false, "en-US"), exportScope(40, true, "en-US")], ["The only item in stock.", "40 items, with the current search and filters."]);
  assert.equal(mercadoLivreSummary({ count: 12, skipped: 1 }, "en-US"), "12 listings exported · 1 brand was left out (no stock, or priced under R$ 8.00).");
});

// Builds the item lists' texts and notes in English.
test("Shared: the item lists speak English", () => {
  const categories = ITEM_LIST_TEXTS["en-US"].categories;
  assert.equal(categories.inUse("Motor", 1), "1 item uses “Motor”. Change the category of these items before deleting it.");
  assert.equal(categories.merged("Freio", "Freios", 3), "Category “Freio” joined into “Freios”: 3 items moved.");
  assert.equal(ITEM_LIST_TEXTS["en-US"].vehicleModels.taken, "A model with this name already exists in this brand.");
  assert.equal(catalogDeleteNote("vehicleBrands", { id: "1", name: "Ford", inCatalog: true }, "en-US"), "“Ford” also leaves the Catalog, with its models and sheets.");
});

// Builds the photos', the sync's and the tutorial's texts in English.
test("Shared: the photos, the sync and the tutorial speak English", () => {
  assert.deepEqual([photoCount(1, "en-US"), photoCount(3, "en-US")], ["1 photo", "3 photos"]);
  assert.deepEqual(takePhotos([{ name: "motor.gif", type: "image/gif", size: 10 }], 0, 3, "en-US").problems, ["motor.gif: isn't a JPG, PNG or WebP"]);
  assert.equal(copyNotice(new Date(2026, 10, 23, 14, 5), "en-US"), "No connection to the server. Showing the copy from 11/23 at 14:05.");
  assert.equal(INVENTORY_NEEDS_SERVER["en-US"].export, "No connection to the server. Exporting can only be done with it.");
  assert.equal(CONFLICT_MESSAGES["en-US"].keepMine, "Keep the phone's");
  assert.deepEqual(INVENTORY_TUTORIAL_PARTS["en-US"], ["Add an item", "Search and filter", "Edit and delete"]);
});
