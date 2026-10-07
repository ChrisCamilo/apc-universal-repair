import assert from "node:assert/strict";
import { test } from "node:test";
import {
  codeTakenMessage,
  EMPTY_ITEM_FORM,
  ITEM_FIELD_LABELS,
  ITEM_FORM_MESSAGES,
  itemDetailTexts,
  itemFormBody,
  itemFormErrors,
  itemFormOf,
  itemFormOptions,
  modelsOfBrand,
  parsePrice,
  priceInput,
  type ItemForm,
} from "./itemForm.ts";
import type { Item } from "./items.ts";

const FILTER = item({ id: "a", code: "W 712/95", name: "Filtro de óleo", vehicleBrand: "Volkswagen", vehicleModel: "Gol", color: "N/A" });
const PADS = item({ id: "b", code: "FRA-1000", name: "Pastilha", vehicleBrand: "Chevrolet", vehicleModel: "Opala", color: "Preto" });
const ITEMS = [FILTER, PADS, item({ id: "c", code: "X-1", name: "Junta", vehicleBrand: "volkswagen", vehicleModel: "Santana", color: "Azul" })];
const VALID: ItemForm = {
  ...EMPTY_ITEM_FORM,
  code: "ngk-b7",
  name: "vela de ignição",
  category: "ignição",
  partBrand: "NGK",
  vehicleBrand: "chevrolet",
  price: "34,9",
};

/**
 * Fills in an item with the fields a test doesn't look at.
 * @param fields The fields that matter here.
 * @returns A complete item.
 */
function item(fields: Partial<Item> & Pick<Item, "id" | "code" | "name">): Item {
  return {
    category: "Motor",
    partBrand: "Bosch",
    vehicleBrand: "Volkswagen",
    vehicleModel: null,
    position: "N/A",
    side: "N/A",
    color: "N/A",
    location: null,
    quantity: 1,
    minQuantity: 0,
    unitPriceCents: 3990,
    createdAt: "2026-10-03T12:00:00.000Z",
    updatedAt: "2026-10-03T12:00:00.000Z",
    ...fields,
  };
}

// Reads prices typed in the Brazilian format, with thousands, one or two decimals, no decimals and the currency
// sign, and checks anything else isn't a price, such as a dot that isn't between thousands.
test("Shared: prices are read in the Brazilian format", () => {
  assert.equal(parsePrice("1.234,56"), 123456);
  assert.equal(parsePrice("89,9"), 8990);
  assert.equal(parsePrice("R$ 12"), 1200);
  assert.equal(parsePrice(" 0,05 "), 5);
  assert.equal(parsePrice("1.234.567"), 123456700);
  for (const wrong of ["", "12,345", "1,2,3", "abc", "12.5", "1.23,00"]) {
    assert.equal(parsePrice(wrong), null, wrong);
  }
});

// Writes prices back for the price field and checks they read the same.
test("Shared: prices are written back in the Brazilian format", () => {
  assert.equal(priceInput(123456), "1.234,56");
  assert.equal(priceInput(8990), "89,90");
  assert.equal(parsePrice(priceInput(5)), 5);
});

// Checks a blank form names every required field, a price that isn't above zero says so, and a filled-in form passes.
test("Shared: the item form names each required field left blank", () => {
  assert.deepEqual(itemFormErrors(EMPTY_ITEM_FORM, ITEMS), {
    code: ITEM_FORM_MESSAGES.code,
    name: ITEM_FORM_MESSAGES.name,
    category: ITEM_FORM_MESSAGES.category,
    partBrand: ITEM_FORM_MESSAGES.partBrand,
    vehicleBrand: ITEM_FORM_MESSAGES.vehicleBrand,
    price: ITEM_FORM_MESSAGES.price,
  });
  assert.deepEqual(itemFormErrors({ ...VALID, price: "0,00" }, ITEMS), { price: ITEM_FORM_MESSAGES.priceInvalid });
  assert.deepEqual(itemFormErrors({ ...VALID, price: "abc" }, ITEMS), { price: ITEM_FORM_MESSAGES.priceInvalid });
  assert.deepEqual(itemFormErrors(VALID, ITEMS), {});
});

// Types a code another item uses, in another case, and checks it is refused naming that item, while the item being
// edited keeps its own code.
test("Shared: a code another item uses is refused, naming it", () => {
  assert.deepEqual(itemFormErrors({ ...VALID, code: "fra-1000" }, ITEMS), { code: codeTakenMessage("Pastilha") });
  assert.deepEqual(itemFormErrors({ ...VALID, code: "FRA-1000" }, ITEMS, PADS.id), {});
});

// Builds the body of a filled-in form and checks the writing rule: capitals on every text, an uppercase code, an
// existing color in its own spelling, an empty color as N/A, blank quantities as zero and the price in cents.
test("Shared: the item body follows the writing rule", () => {
  assert.deepEqual(itemFormBody({ ...VALID, color: "preto", location: "a-2", quantity: "3" }, ["Azul", "Preto"]), {
    code: "NGK-B7",
    name: "Vela de ignição",
    category: "Ignição",
    partBrand: "NGK",
    vehicleBrand: "Chevrolet",
    vehicleModel: "",
    quantity: 3,
    minQuantity: 0,
    position: "N/A",
    side: "N/A",
    color: "Preto",
    location: "A-2",
    unitPriceCents: 3490,
  });
  assert.equal(itemFormBody(VALID, []).color, "N/A");
});

// Fills the form with an item to edit and checks every field, the N/A color left blank and the price in the
// Brazilian format, and that saving it back gives the same values.
test("Shared: an item fills the form and saves back unchanged", () => {
  const form = itemFormOf(FILTER);
  assert.deepEqual(form, {
    code: "W 712/95",
    name: "Filtro de óleo",
    category: "Motor",
    partBrand: "Bosch",
    vehicleBrand: "Volkswagen",
    vehicleModel: "Gol",
    quantity: "1",
    minQuantity: "0",
    position: "N/A",
    side: "N/A",
    color: "",
    location: "",
    price: "39,90",
  });
  const body = itemFormBody(form, []);
  assert.equal(body.unitPriceCents, FILTER.unitPriceCents);
  assert.equal(body.color, "N/A");
});

// Lists the options from the items in stock and checks each list is distinct ignoring case and sorted, the colors
// leave N/A out, and the models are those of the chosen vehicle brand, ignoring case, with none before a brand.
test("Shared: the form's options come from the items in stock", () => {
  assert.deepEqual(itemFormOptions(ITEMS), {
    categories: ["Motor"],
    partBrands: ["Bosch"],
    vehicleBrands: ["Chevrolet", "Volkswagen"],
    colors: ["Azul", "Preto"],
  });
  assert.deepEqual(modelsOfBrand(ITEMS, "VOLKSWAGEN"), ["Gol", "Santana"]);
  assert.deepEqual(modelsOfBrand(ITEMS, " "), []);
});

// Writes out the details of an item with every field filled in and of one with nothing optional, and checks the
// position and side by their full names, the price in reais, what doesn't apply or is missing said in words, and a
// text for every labeled field, in the form's order.
test("Shared: an item's details are written out field by field", () => {
  const full = itemDetailTexts({ ...PADS, position: "D", side: "LE", location: "B-10", unitPriceCents: 123456 });
  assert.deepEqual(full, {
    code: "FRA-1000",
    name: "Pastilha",
    category: "Motor",
    partBrand: "Bosch",
    vehicleBrand: "Chevrolet",
    vehicleModel: "Opala",
    quantity: "1",
    minQuantity: "0",
    position: "Dianteiro",
    side: "Lado esquerdo",
    color: "Preto",
    location: "B-10",
    price: "R$ 1.234,56",
  });
  assert.deepEqual(Object.keys(full), Object.keys(ITEM_FIELD_LABELS));
  const bare = itemDetailTexts({ ...FILTER, vehicleModel: null });
  assert.equal(bare.vehicleModel, "Qualquer modelo");
  assert.equal(bare.position, "Não se aplica");
  assert.equal(bare.side, "Não se aplica");
  assert.equal(bare.color, "Não se aplica");
  assert.equal(bare.location, "Não informado");
});
