import assert from "node:assert/strict";
import { test } from "node:test";
import {
  codeTakenError,
  codeTakenMessage,
  EMPTY_ITEM_FORM,
  ITEM_FIELD_LABELS,
  ITEM_FORM_MESSAGES,
  itemDetailTexts,
  itemFormBody,
  itemFormChanged,
  itemFormErrors,
  itemFormOf,
  itemFormOptions,
  modelsOfBrand,
  parsePrice,
  priceInput,
  priceMask,
  priceText,
  quantityInput,
  type ItemForm,
} from "./itemForm.ts";
import type { Item } from "./items.ts";
import type { ItemLists } from "../lists/lists.ts";

const FILTER = item({ id: "a", code: "W 712/95", name: "Filtro de óleo", vehicleBrand: "Volkswagen", vehicleModel: "Gol", color: "N/A" });
const PADS = item({ id: "b", code: "FRA-1000", name: "Pastilha", vehicleBrand: "Chevrolet", vehicleModel: "Opala", color: "Preto" });
const ITEMS = [FILTER, PADS, item({ id: "c", code: "X-1", name: "Junta", vehicleBrand: "volkswagen", vehicleModel: "Santana", color: "Azul" })];
// The lists the API keeps: what the items use, plus the category and the brand of a new spark plug.
const LISTS: ItemLists = {
  categories: [{ id: "ignicao", name: "Ignição" }, { id: "motor", name: "Motor" }],
  partBrands: [{ id: "bosch", name: "Bosch" }, { id: "ngk", name: "NGK" }],
  vehicleBrands: [{ id: "chevrolet", name: "Chevrolet" }, { id: "volkswagen", name: "Volkswagen" }],
  vehicleModels: [
    { id: "opala", name: "Opala", vehicleBrandId: "chevrolet" },
    { id: "santana", name: "Santana", vehicleBrandId: "volkswagen" },
    { id: "gol", name: "Gol", vehicleBrandId: "volkswagen" },
  ],
};
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
    photos: [],
    createdAt: "2026-10-03T12:00:00.000Z",
    updatedAt: "2026-10-03T12:00:00.000Z",
    ...fields,
  };
}

// Reads prices with thousands, one or two decimals, no decimals and the currency sign, a dot and a comma meaning the
// same: the last one before one or two digits starts the cents, any other one goes between thousands. Anything else
// isn't a price.
test("Shared: prices are read with a dot or a comma alike", () => {
  assert.equal(parsePrice("1.234,56"), 123456);
  assert.equal(parsePrice("1,234.56"), 123456);
  assert.equal(parsePrice("7,50"), 750);
  assert.equal(parsePrice("7.50"), 750);
  assert.equal(parsePrice("R$ 7,50"), 750);
  assert.equal(parsePrice("89,9"), 8990);
  assert.equal(parsePrice("12.5"), 1250);
  assert.equal(parsePrice("R$ 12"), 1200);
  assert.equal(parsePrice(" 0,05 "), 5);
  assert.equal(parsePrice("1.500"), 150000);
  assert.equal(parsePrice("1.234.567"), 123456700);
  for (const wrong of ["", "1,2,3", "abc", "1.23,00", "12,3456", "-7,50"]) {
    assert.equal(parsePrice(wrong), null, wrong);
  }
});

// Writes prices back, for the CSV and for the price field, and checks they read the same.
test("Shared: prices are written back in the Brazilian format", () => {
  assert.equal(priceInput(123456), "1.234,56");
  assert.equal(priceInput(8990), "89,90");
  assert.equal(parsePrice(priceInput(5)), 5);
  assert.equal(priceText(123456), "R$ 1.234,56");
  assert.equal(parsePrice(priceText(5)), 5);
});

// Types digits into the price field one by one and erases them, and checks they fill from the cents, other characters
// typed are left out and the field empties at zero; a digit that would pass a million is left out too.
test("Shared: the price field fills from the cents as digits are typed", () => {
  let field = "";
  for (const digit of "750") {
    field = priceMask(field, field + digit).value;
  }
  assert.equal(field, "R$ 7,50");
  assert.deepEqual(priceMask(field, `${field},`), { value: "R$ 7,50" });
  assert.deepEqual(priceMask("R$ 7,50", "R$ 7,5"), { value: "R$ 0,75" });
  assert.deepEqual(priceMask("R$ 0,05", "R$ 0,0"), { value: "" });
  assert.deepEqual(priceMask("R$ 12.345,67", "R$ 12.345,678"), { value: "R$ 123.456,78" });
  assert.deepEqual(priceMask("R$ 1.000.000,00", "R$ 1.000.000,001"), { value: "R$ 1.000.000,00" });
});

// Pastes prices into the price field and checks a dot and a comma mean the same, a whole number is in reais, a paste
// that isn't a price or passes a million is refused with its message, and clearing the field empties it.
test("Shared: a price pasted into the field is read as a price", () => {
  assert.deepEqual(priceMask("", "7.50"), { value: "R$ 7,50" });
  assert.deepEqual(priceMask("", "7,50"), { value: "R$ 7,50" });
  assert.deepEqual(priceMask("", "12"), { value: "R$ 12,00" });
  assert.deepEqual(priceMask("R$ 39,90", "1,234.56"), { value: "R$ 1.234,56" });
  assert.deepEqual(priceMask("R$ 39,90", "abc"), { value: "R$ 39,90", message: ITEM_FORM_MESSAGES.priceInvalid });
  assert.deepEqual(priceMask("R$ 39,90", "2.000.000"), { value: "R$ 39,90", message: ITEM_FORM_MESSAGES.priceTooHigh });
  assert.deepEqual(priceMask("R$ 39,90", ""), { value: "" });
  assert.equal(ITEM_FORM_MESSAGES.priceTooHigh, "Informe no máximo R$ 1.000.000,00.");
});

// Checks a blank form names every required field, a price that isn't above zero says so, and a filled-in form passes.
test("Shared: the item form names each required field left blank", () => {
  assert.deepEqual(itemFormErrors(EMPTY_ITEM_FORM, ITEMS, LISTS), {
    code: ITEM_FORM_MESSAGES.code,
    name: ITEM_FORM_MESSAGES.name,
    category: ITEM_FORM_MESSAGES.category,
    partBrand: ITEM_FORM_MESSAGES.partBrand,
    vehicleBrand: ITEM_FORM_MESSAGES.vehicleBrand,
    price: ITEM_FORM_MESSAGES.price,
  });
  assert.deepEqual(itemFormErrors({ ...VALID, price: "0,00" }, ITEMS, LISTS), { price: ITEM_FORM_MESSAGES.priceInvalid });
  assert.deepEqual(itemFormErrors({ ...VALID, price: "abc" }, ITEMS, LISTS), { price: ITEM_FORM_MESSAGES.priceInvalid });
  assert.deepEqual(itemFormErrors({ ...VALID, price: "R$ 1.000.000,01" }, ITEMS, LISTS), { price: ITEM_FORM_MESSAGES.priceTooHigh });
  assert.deepEqual(itemFormErrors({ ...VALID, price: "R$ 1.000.000,00" }, ITEMS, LISTS), {});
  assert.deepEqual(itemFormErrors(VALID, ITEMS, LISTS), {});
});

// Fills in quantities at the limit and past it, and checks only the ones past it are refused.
test("Shared: the item form refuses quantities past the limit", () => {
  assert.deepEqual(itemFormErrors({ ...VALID, quantity: "1000000", minQuantity: "1000000" }, ITEMS, LISTS), {});
  assert.deepEqual(itemFormErrors({ ...VALID, quantity: "1000001", minQuantity: "99999999999" }, ITEMS, LISTS), {
    quantity: ITEM_FORM_MESSAGES.quantityTooHigh,
    minQuantity: ITEM_FORM_MESSAGES.quantityTooHigh,
  });
  assert.equal(ITEM_FORM_MESSAGES.quantityTooHigh, "Informe no máximo 1.000.000.");
});

// Types and pastes into a quantity field and checks whole numbers are taken, without leading zeros or thousands
// dots, one other character typed is left out without a word, and a pasted fraction, sign or text is refused with
// the message, the field keeping its value.
test("Shared: quantity fields take whole numbers only, typed or pasted", () => {
  assert.deepEqual(quantityInput("1", "12"), { value: "12" });
  assert.deepEqual(quantityInput("12", "1"), { value: "1" });
  assert.deepEqual(quantityInput("1", ""), { value: "" });
  assert.deepEqual(quantityInput("", "007"), { value: "7" });
  assert.deepEqual(quantityInput("", "0"), { value: "0" });
  assert.deepEqual(quantityInput("", " 1.000 "), { value: "1000" });
  for (const typed of ["12,", "12.", "-12", "12e"]) {
    assert.deepEqual(quantityInput("12", typed), { value: "12" }, typed);
  }
  for (const pasted of ["1,5", "-2", "abc", "1.5", "2 un"]) {
    assert.deepEqual(quantityInput("3", pasted), { value: "3", message: ITEM_FORM_MESSAGES.quantityInvalid }, pasted);
  }
});

// Types a category, brands and a model the lists don't hold and checks each is refused pointing to the Create
// option, while names the lists hold pass ignoring case, accents and extra spaces, and a model is only checked
// within a listed brand.
test("Shared: the item form refuses names its lists don't hold", () => {
  const unlisted = { ...VALID, category: "Motor diesel", partBrand: "Cofap", vehicleBrand: "Fiat", vehicleModel: "Uno" };
  assert.deepEqual(itemFormErrors(unlisted, ITEMS, LISTS), {
    category: ITEM_FORM_MESSAGES.categoryNotListed,
    partBrand: ITEM_FORM_MESSAGES.partBrandNotListed,
    vehicleBrand: ITEM_FORM_MESSAGES.vehicleBrandNotListed,
  });
  assert.deepEqual(itemFormErrors({ ...VALID, vehicleBrand: "Volkswagen", vehicleModel: "Opala" }, ITEMS, LISTS), {
    vehicleModel: ITEM_FORM_MESSAGES.vehicleModelNotListed,
  });
  const spelled = { ...VALID, category: " IGNICAO ", partBrand: "ngk", vehicleBrand: "volkswagen", vehicleModel: "gol" };
  assert.deepEqual(itemFormErrors(spelled, ITEMS, LISTS), {});
});

// Types a code another item uses, in another case, and checks it is refused naming that item, while the item being
// edited keeps its own code.
test("Shared: a code another item uses is refused, naming it", () => {
  assert.deepEqual(itemFormErrors({ ...VALID, code: "fra-1000" }, ITEMS, LISTS), { code: codeTakenMessage("Pastilha") });
  assert.deepEqual(itemFormErrors({ ...VALID, code: "FRA-1000" }, ITEMS, LISTS, PADS.id), {});
});

// Checks codes as they are typed: one another item uses, in another case, with spaces around it or with other
// separators, as the search compares codes, names that item; a code on its way to it, a free one and an empty one say
// nothing; and the item being edited keeps its own code.
test("Shared: a code is checked against the other items as it is typed", () => {
  assert.equal(codeTakenError(" w 712/95 ", ITEMS), codeTakenMessage("Filtro de óleo"));
  assert.equal(codeTakenError("w71295", ITEMS), codeTakenMessage("Filtro de óleo"));
  assert.equal(codeTakenError("FRA 1000", ITEMS), codeTakenMessage("Pastilha"));
  assert.equal(codeTakenError("W 712", ITEMS), undefined);
  assert.equal(codeTakenError("NOVO-1", ITEMS), undefined);
  assert.equal(codeTakenError("", ITEMS), undefined);
  assert.equal(codeTakenError("W 712/95", ITEMS, FILTER.id), undefined);
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
    price: "R$ 39,90",
  });
  const body = itemFormBody(form, []);
  assert.equal(body.unitPriceCents, FILTER.unitPriceCents);
  assert.equal(body.color, "N/A");
});

// Fills the form with an item and checks it is no change as it is, nor with fields only written differently (the name
// in lowercase, the price without its last zero), and is one once a quantity changes.
test("Shared: an edit only changes the item when what is sent differs", () => {
  const form = itemFormOf(FILTER);
  assert.equal(itemFormChanged(form, FILTER, []), false);
  assert.equal(itemFormChanged({ ...form, name: "filtro de óleo", price: "39,9" }, FILTER, []), false);
  assert.equal(itemFormChanged({ ...form, quantity: "7" }, FILTER, []), true);
});

// Lists the options and checks the comboboxes offer every name of the lists, sorted, the colors are the ones in
// stock without N/A, and the models are those of the chosen vehicle brand, ignoring case, with none before a
// brand of the list.
test("Shared: the form's options come from the lists", () => {
  assert.deepEqual(itemFormOptions(ITEMS, LISTS), {
    categories: ["Ignição", "Motor"],
    partBrands: ["Bosch", "NGK"],
    vehicleBrands: ["Chevrolet", "Volkswagen"],
    colors: ["Azul", "Preto"],
  });
  assert.deepEqual(modelsOfBrand(LISTS, "VOLKSWAGEN"), ["Gol", "Santana"]);
  assert.deepEqual(modelsOfBrand(LISTS, "Fiat"), []);
  assert.deepEqual(modelsOfBrand(LISTS, " "), []);
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
