import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addCodes,
  BRAND_FIELD_LABELS,
  brandDetailTexts,
  brandPlaceText,
  changedVehicle,
  codesInput,
  colorInput,
  codeTakenError,
  codeTakenMessage,
  descriptionInput,
  duplicateForm,
  EMPTY_BRAND_FORM,
  EMPTY_ITEM_FORM,
  EMPTY_VEHICLE_FORM,
  formValue,
  hasFormErrors,
  ITEM_FIELD_LABELS,
  ITEM_FORM_MESSAGES,
  itemDetailTexts,
  itemFormBody,
  itemFormChanged,
  itemFormErrors,
  itemFormOf,
  itemFormOptions,
  itemNoteTexts,
  modelsOfBrand,
  originalCodeMessages,
  photoPickerTexts,
  photoSources,
  PHOTO_SOURCES_LIMIT,
  originalCodesText,
  parsePrice,
  positionSideText,
  priceInput,
  priceMask,
  priceText,
  quantityInput,
  POSITION_CHOICES,
  SIDE_CHOICES,
  splitCodes,
  vehicleFormErrors,
  vehiclesText,
  vehicleText,
  withFormValues,
  type ItemForm,
} from "./itemForm.ts";
import { POSITION_SEGMENTS, SIDE_SEGMENTS } from "./itemFilters.ts";
import type { Item } from "./items.ts";
import type { ItemLists } from "./lists.ts";
import { testItem, type FlatItem } from "./testItems.ts";

// An oil filter with the vehicle maker's original code.
const FILTER = item({
  id: "a",
  code: "W 712/95",
  name: "Filtro de óleo",
  vehicleBrand: "Volkswagen",
  vehicleModel: "Gol",
  color: "N/A",
  originalCodes: ["030 115 561 AN"],
});
// A part of two brands, the second at its own price, quantity and location.
const PADS = item({
  id: "b",
  name: "Pastilha",
  vehicleBrand: "Chevrolet",
  vehicleModel: "Opala",
  minQuantity: 2,
  brands: [
    { id: "b1", partBrand: "Bosch", code: "FRA-1000", color: "PRETO", location: null, quantity: 1, unitPriceCents: 3990, photos: [] },
    { id: "b2", partBrand: "Fras-le", code: "PD-1000", color: "N/A", location: "B-10", quantity: 3, unitPriceCents: 4990, photos: [] },
  ],
});
const ITEMS = [FILTER, PADS, item({ id: "c", code: "X-1", name: "Junta", vehicleBrand: "volkswagen", vehicleModel: "Santana", color: "AZUL" })];
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
const VALID: ItemForm = withFormValues(EMPTY_ITEM_FORM, {
  code: "ngk-b7",
  name: "vela de ignição",
  category: "ignição",
  partBrand: "NGK",
  vehicleBrand: "chevrolet",
  price: "34,9",
});

/**
 * Fills in an item with the fields a test doesn't look at.
 * @param fields The fields that matter here.
 * @returns A complete item.
 */
function item(fields: FlatItem & Required<Pick<FlatItem, "id" | "name">>): Item {
  return testItem({
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
  });
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
    field = priceMask(field, field + digit, "pt-BR").value;
  }
  assert.equal(field, "R$ 7,50");
  assert.deepEqual(priceMask(field, `${field},`, "pt-BR"), { value: "R$ 7,50" });
  assert.deepEqual(priceMask("R$ 7,50", "R$ 7,5", "pt-BR"), { value: "R$ 0,75" });
  assert.deepEqual(priceMask("R$ 0,05", "R$ 0,0", "pt-BR"), { value: "" });
  assert.deepEqual(priceMask("R$ 12.345,67", "R$ 12.345,678", "pt-BR"), { value: "R$ 123.456,78" });
  assert.deepEqual(priceMask("R$ 1.000.000,00", "R$ 1.000.000,001", "pt-BR"), { value: "R$ 1.000.000,00" });
});

// Pastes prices into the price field and checks a dot and a comma mean the same, a whole number is in reais, a paste
// that isn't a price or passes a million is refused with its message, and clearing the field empties it.
test("Shared: a price pasted into the field is read as a price", () => {
  assert.deepEqual(priceMask("", "7.50", "pt-BR"), { value: "R$ 7,50" });
  assert.deepEqual(priceMask("", "7,50", "pt-BR"), { value: "R$ 7,50" });
  assert.deepEqual(priceMask("", "12", "pt-BR"), { value: "R$ 12,00" });
  assert.deepEqual(priceMask("R$ 39,90", "1,234.56", "pt-BR"), { value: "R$ 1.234,56" });
  assert.deepEqual(priceMask("R$ 39,90", "abc", "pt-BR"), { value: "R$ 39,90", message: ITEM_FORM_MESSAGES["pt-BR"].priceInvalid });
  assert.deepEqual(priceMask("R$ 39,90", "2.000.000", "pt-BR"), { value: "R$ 39,90", message: ITEM_FORM_MESSAGES["pt-BR"].priceTooHigh });
  assert.deepEqual(priceMask("R$ 39,90", "", "pt-BR"), { value: "" });
  assert.equal(ITEM_FORM_MESSAGES["pt-BR"].priceTooHigh, "Informe no máximo R$ 1.000.000,00.");
});

// Changes a vehicle's line field by field and checks emptying the model clears its generation and version, emptying the
// generation clears the version, and any other change keeps the rest.
test("Shared: a vehicle's line clears what waits on a field emptied", () => {
  const line = { vehicleBrand: "Chevrolet", vehicleModel: "Monza", generation: "85/90", version: "1.6 GLX" };
  assert.deepEqual(changedVehicle(line, "vehicleModel", " "), { ...line, vehicleModel: " ", generation: "", version: "" });
  assert.deepEqual(changedVehicle(line, "generation", ""), { ...line, generation: "", version: "" });
  assert.deepEqual(changedVehicle(line, "vehicleModel", "Monza Classic"), { ...line, vehicleModel: "Monza Classic" });
  assert.deepEqual(changedVehicle(line, "version", ""), { ...line, version: "" });
});

// Checks a blank form names every required field, the item's and its brand's, a price that isn't above zero says so,
// and a filled-in form passes.
test("Shared: the item form names each required field left blank", () => {
  assert.deepEqual(itemFormErrors(EMPTY_ITEM_FORM, ITEMS, LISTS, "pt-BR"), {
    name: ITEM_FORM_MESSAGES["pt-BR"].name,
    category: ITEM_FORM_MESSAGES["pt-BR"].category,
    vehicles: [{ vehicleBrand: ITEM_FORM_MESSAGES["pt-BR"].vehicleBrand }],
    brands: [{ partBrand: ITEM_FORM_MESSAGES["pt-BR"].partBrand, code: ITEM_FORM_MESSAGES["pt-BR"].code, price: ITEM_FORM_MESSAGES["pt-BR"].price }],
  });
  assert.deepEqual(itemFormErrors(withFormValues(VALID, { price: "0,00" }), ITEMS, LISTS, "pt-BR"), { brands: [{ price: ITEM_FORM_MESSAGES["pt-BR"].priceInvalid }] });
  assert.deepEqual(itemFormErrors(withFormValues(VALID, { price: "abc" }), ITEMS, LISTS, "pt-BR"), { brands: [{ price: ITEM_FORM_MESSAGES["pt-BR"].priceInvalid }] });
  assert.deepEqual(itemFormErrors(withFormValues(VALID, { price: "R$ 1.000.000,01" }), ITEMS, LISTS, "pt-BR"), {
    brands: [{ price: ITEM_FORM_MESSAGES["pt-BR"].priceTooHigh }],
  });
  assert.deepEqual(itemFormErrors(withFormValues(VALID, { price: "R$ 1.000.000,00" }), ITEMS, LISTS, "pt-BR"), {});
  assert.deepEqual(itemFormErrors(VALID, ITEMS, LISTS, "pt-BR"), {});
  assert.equal(hasFormErrors(itemFormErrors(VALID, ITEMS, LISTS, "pt-BR")), false);
  assert.equal(hasFormErrors({ brands: [{}, { code: ITEM_FORM_MESSAGES["pt-BR"].code }] }), true);
  assert.equal(hasFormErrors({ name: ITEM_FORM_MESSAGES["pt-BR"].name }), true);
});

// Fills in quantities at the limit and past it, and checks only the ones past it are refused.
test("Shared: the item form refuses quantities past the limit", () => {
  assert.deepEqual(itemFormErrors(withFormValues(VALID, { quantity: "1000000", minQuantity: "1000000" }), ITEMS, LISTS, "pt-BR"), {});
  assert.deepEqual(itemFormErrors(withFormValues(VALID, { quantity: "1000001", minQuantity: "99999999999" }), ITEMS, LISTS, "pt-BR"), {
    minQuantity: ITEM_FORM_MESSAGES["pt-BR"].quantityTooHigh,
    brands: [{ quantity: ITEM_FORM_MESSAGES["pt-BR"].quantityTooHigh }],
  });
  assert.equal(ITEM_FORM_MESSAGES["pt-BR"].quantityTooHigh, "Informe no máximo 1.000.000.");
});

// Types and pastes into a quantity field and checks whole numbers are taken, without leading zeros or thousands
// dots, one other character typed is left out without a word, and a pasted fraction, sign or text is refused with
// the message, the field keeping its value.
test("Shared: quantity fields take whole numbers only, typed or pasted", () => {
  assert.deepEqual(quantityInput("1", "12", "pt-BR"), { value: "12" });
  assert.deepEqual(quantityInput("12", "1", "pt-BR"), { value: "1" });
  assert.deepEqual(quantityInput("1", "", "pt-BR"), { value: "" });
  assert.deepEqual(quantityInput("", "007", "pt-BR"), { value: "7" });
  assert.deepEqual(quantityInput("", "0", "pt-BR"), { value: "0" });
  assert.deepEqual(quantityInput("", " 1.000 ", "pt-BR"), { value: "1000" });
  for (const typed of ["12,", "12.", "-12", "12e"]) {
    assert.deepEqual(quantityInput("12", typed, "pt-BR"), { value: "12" }, typed);
  }
  for (const pasted of ["1,5", "-2", "abc", "1.5", "2 un"]) {
    assert.deepEqual(quantityInput("3", pasted, "pt-BR"), { value: "3", message: ITEM_FORM_MESSAGES["pt-BR"].quantityInvalid }, pasted);
  }
});

// Types a category, brands and a model the lists don't hold and checks each is refused pointing to the Create
// option, while names the lists hold pass ignoring case, accents and extra spaces, and a model is only checked
// within a listed brand.
test("Shared: the item form refuses names its lists don't hold", () => {
  const unlisted = withFormValues(VALID, { category: "Motor diesel", partBrand: "Cofap", vehicleBrand: "Fiat", vehicleModel: "Uno" });
  assert.deepEqual(itemFormErrors(unlisted, ITEMS, LISTS, "pt-BR"), {
    category: ITEM_FORM_MESSAGES["pt-BR"].categoryNotListed,
    vehicles: [{ vehicleBrand: ITEM_FORM_MESSAGES["pt-BR"].vehicleBrandNotListed }],
    brands: [{ partBrand: ITEM_FORM_MESSAGES["pt-BR"].partBrandNotListed }],
  });
  assert.deepEqual(itemFormErrors(withFormValues(VALID, { vehicleBrand: "Volkswagen", vehicleModel: "Opala" }), ITEMS, LISTS, "pt-BR"), {
    vehicles: [{ vehicleModel: ITEM_FORM_MESSAGES["pt-BR"].vehicleModelNotListed }],
  });
  const spelled = withFormValues(VALID, { category: " IGNICAO ", partBrand: "ngk", vehicleBrand: "volkswagen", vehicleModel: "gol" });
  assert.deepEqual(itemFormErrors(spelled, ITEMS, LISTS, "pt-BR"), {});
});

// Gives the form a second vehicle, then the first one again written otherwise, and Universal among others, and
// checks the repeated vehicle and Universal are refused on their lines, while two models of one brand pass.
test("Shared: a vehicle appears once in an item, and Universal alone", () => {
  const two = { ...VALID, vehicles: [{ vehicleBrand: "Chevrolet", vehicleModel: "Opala" }, { vehicleBrand: "Volkswagen", vehicleModel: "Gol" }] };
  assert.deepEqual(itemFormErrors(two, ITEMS, LISTS, "pt-BR"), {});
  const repeated = { ...two, vehicles: [...two.vehicles, { vehicleBrand: " chevrolet ", vehicleModel: "OPALA" }] };
  assert.deepEqual(itemFormErrors(repeated, ITEMS, LISTS, "pt-BR").vehicles, [{}, {}, { vehicleModel: ITEM_FORM_MESSAGES["pt-BR"].vehicleRepeated }]);
  const universal = { ...two, vehicles: [{ vehicleBrand: "Universal", vehicleModel: "" }, EMPTY_VEHICLE_FORM] };
  assert.equal(itemFormErrors(universal, ITEMS, LISTS, "pt-BR").vehicles?.[0].vehicleBrand, ITEM_FORM_MESSAGES["pt-BR"].universalAlone);
  assert.equal(hasFormErrors({ vehicles: [{}] }), false);
});

// Checks the vehicles alone, as a phone's form does before a new vehicle joins the chips: a listed one passes, one
// the item already has, one not in the list and a blank one are refused, and each chip is named by its vehicle.
test("Shared: a phone's new vehicle is checked against the item's before it joins them", () => {
  const held = [{ vehicleBrand: "Chevrolet", vehicleModel: "Opala" }];
  assert.deepEqual(vehicleFormErrors([...held, { vehicleBrand: "volkswagen", vehicleModel: "" }], LISTS, "pt-BR").at(-1), {});
  assert.deepEqual(vehicleFormErrors([...held, { vehicleBrand: "Chevrolet", vehicleModel: "opala" }], LISTS, "pt-BR").at(-1), {
    vehicleModel: ITEM_FORM_MESSAGES["pt-BR"].vehicleRepeated,
  });
  assert.deepEqual(vehicleFormErrors([...held, { vehicleBrand: "Fiat", vehicleModel: "" }], LISTS, "pt-BR").at(-1), {
    vehicleBrand: ITEM_FORM_MESSAGES["pt-BR"].vehicleBrandNotListed,
  });
  assert.deepEqual(vehicleFormErrors([EMPTY_VEHICLE_FORM], LISTS, "pt-BR"), [{ vehicleBrand: ITEM_FORM_MESSAGES["pt-BR"].vehicleBrand }]);
  assert.equal(vehicleText({ vehicleBrand: "Volkswagen", vehicleModel: "Gol" }, "pt-BR"), "Volkswagen Gol");
  assert.equal(vehicleText({ vehicleBrand: "Volkswagen", vehicleModel: "" }, "pt-BR"), "Volkswagen (qualquer modelo)");
});

// Types a vehicle's generation and version: "08/12" goes as its years and the version as typed, both left out when
// blank; a generation that isn't years or a version past 30 characters is refused on its field; the same model in two
// generations is no repeat; and an item's generation fills the form as "08/12" and shows so in its details.
test("Shared: a vehicle's generation and version are checked and sent as years", () => {
  const gol = { vehicleBrand: "Volkswagen", vehicleModel: "Gol" };
  const form = { ...VALID, vehicles: [{ ...gol, generation: "08/12", version: "1.0 g5" }, { ...gol, generation: "2013-" }] };
  assert.deepEqual(itemFormErrors(form, ITEMS, LISTS, "pt-BR"), {});
  assert.deepEqual(itemFormBody(form, []).vehicles, [
    { ...gol, firstYear: 2008, lastYear: 2012, version: "1.0 g5" },
    { ...gol, firstYear: 2013, lastYear: null },
  ]);
  const wrong = { ...VALID, vehicles: [{ ...gol, generation: "12/08", version: "x".repeat(31) }] };
  assert.deepEqual(itemFormErrors(wrong, ITEMS, LISTS, "pt-BR").vehicles, [
    { generation: ITEM_FORM_MESSAGES["pt-BR"].generationInvalid, version: ITEM_FORM_MESSAGES["pt-BR"].versionTooLong },
  ]);
  const held = item({ id: "d", name: "Junta", ...gol, firstYear: 2008, lastYear: 2012, version: "1.0 G5" });
  assert.deepEqual(itemFormOf(held).vehicles, [{ ...gol, generation: "08/12", version: "1.0 G5" }]);
  assert.equal(itemFormChanged(itemFormOf(held), held, []), false);
  assert.equal(vehiclesText(held, "pt-BR"), "Volkswagen Gol 08/12 1.0 G5");
  // With its number in the Catalog, the generation fills the form and shows so, and reads back unchanged.
  const numbered = { ...held, vehicles: [{ ...held.vehicles[0], generationNumber: 2 }] };
  assert.deepEqual(itemFormOf(numbered).vehicles, [{ ...gol, generation: "G2 - 08/12", version: "1.0 G5" }]);
  assert.equal(itemFormChanged(itemFormOf(numbered), numbered, []), false);
  assert.equal(vehiclesText(numbered, "pt-BR"), "Volkswagen Gol G2 - 08/12 1.0 G5");
  // A version waits for its generation.
  assert.deepEqual(itemFormErrors({ ...VALID, vehicles: [{ ...gol, version: "1.0 G5" }] }, ITEMS, LISTS, "pt-BR").vehicles, [
    { version: ITEM_FORM_MESSAGES["pt-BR"].versionNeedsGeneration },
  ]);
});

// Types a material and a description: both go with a capital letter, a blank one goes empty so an edit clears it, and
// a description past 30 characters is refused; the description field cuts what passes 30 and counts from 20 on. An
// item's notes fill the form, save back unchanged, and list in its details only when it has them, the description first.
test("Shared: an item's material and short description are optional, the description up to 30 characters", () => {
  const form = { ...VALID, material: "alumínio", description: "lado do motorista" };
  assert.deepEqual(itemFormErrors(form, ITEMS, LISTS, "pt-BR"), {});
  assert.deepEqual([itemFormBody(form, []).material, itemFormBody(form, []).description], ["Alumínio", "Lado do motorista"]);
  assert.deepEqual([itemFormBody(VALID, []).material, itemFormBody(VALID, []).description], ["", ""]);
  assert.equal(itemFormErrors({ ...VALID, description: "x".repeat(31) }, ITEMS, LISTS, "pt-BR").description, ITEM_FORM_MESSAGES["pt-BR"].descriptionTooLong);
  assert.deepEqual(descriptionInput("Curta"), { value: "Curta" });
  assert.deepEqual(descriptionInput("x".repeat(24)), { value: "x".repeat(24), counter: "24/30" });
  assert.deepEqual(descriptionInput("y".repeat(40)), { value: "y".repeat(30), counter: "30/30" });
  const held = item({ id: "e", name: "Junta", material: "Cortiça", description: "Com furo extra" });
  assert.deepEqual([itemFormOf(held).material, itemFormOf(held).description], ["Cortiça", "Com furo extra"]);
  assert.equal(itemFormChanged(itemFormOf(held), held, []), false);
  assert.equal(itemFormChanged({ ...itemFormOf(held), material: "" }, held, []), true);
  assert.deepEqual(duplicateForm(held).description, "Com furo extra");
  assert.deepEqual(itemNoteTexts(held, "pt-BR"), [
    { field: "description", label: "Descrição curta", text: "Com furo extra" },
    { field: "material", label: "Material", text: "Cortiça" },
  ]);
  assert.deepEqual(itemNoteTexts(FILTER, "pt-BR"), []);
});

// Checks a phone's form names every position and side in full words, N/A first, as the filter sheet does after its
// "every" choice.
test("Shared: a phone's form chooses the position and the side in full words", () => {
  assert.deepEqual(
    POSITION_CHOICES["pt-BR"].map((choice) => choice.label),
    ["N/A", "Dianteira", "Traseira", "Ambas"],
  );
  assert.deepEqual(
    SIDE_CHOICES["pt-BR"].map((choice) => choice.value),
    ["N/A", "LE", "LD", "Ambos"],
  );
  assert.deepEqual(POSITION_SEGMENTS["pt-BR"].slice(1), POSITION_CHOICES["pt-BR"].slice(1));
  assert.deepEqual(SIDE_SEGMENTS["pt-BR"].slice(1), SIDE_CHOICES["pt-BR"].slice(1));
});

// Types a code another item uses, in another case, and checks it is refused naming that item, while the item being
// edited keeps its own code.
test("Shared: a code another item uses is refused, naming it", () => {
  assert.deepEqual(itemFormErrors(withFormValues(VALID, { code: "fra-1000" }), ITEMS, LISTS, "pt-BR"), { brands: [{ code: codeTakenMessage("Pastilha", "pt-BR") }] });
  assert.deepEqual(itemFormErrors(withFormValues(VALID, { code: "FRA-1000" }), ITEMS, LISTS, "pt-BR", PADS.id), {});
});

// Adds a second brand that repeats the first's part brand, in another case, and its code, with other separators, and
// checks each is refused on the second brand only; a second brand of its own passes.
test("Shared: a part brand and a code appear once in an item", () => {
  const twice = { ...VALID, brands: [VALID.brands[0], { ...EMPTY_BRAND_FORM, partBrand: "ngk", code: "NGK B7", price: "R$ 10,00" }] };
  assert.deepEqual(itemFormErrors(twice, ITEMS, LISTS, "pt-BR"), {
    brands: [{}, { partBrand: ITEM_FORM_MESSAGES["pt-BR"].partBrandRepeated, code: ITEM_FORM_MESSAGES["pt-BR"].codeRepeated }],
  });
  const other = { ...VALID, brands: [VALID.brands[0], { ...EMPTY_BRAND_FORM, partBrand: "Bosch", code: "FR7DC", price: "R$ 10,00" }] };
  assert.deepEqual(itemFormErrors(other, ITEMS, LISTS, "pt-BR"), {});
});

// Checks codes as they are typed: one another item's brand uses, in another case, with spaces around it or with
// other separators, as the search compares codes, names that item; a code on its way to it, a free one and an empty
// one say nothing; and the item being edited keeps its own codes, its second brand's too.
test("Shared: a code is checked against the other items as it is typed", () => {
  assert.equal(codeTakenError(" w 712/95 ", ITEMS, "pt-BR"), codeTakenMessage("Filtro de óleo", "pt-BR"));
  assert.equal(codeTakenError("w71295", ITEMS, "pt-BR"), codeTakenMessage("Filtro de óleo", "pt-BR"));
  assert.equal(codeTakenError("FRA 1000", ITEMS, "pt-BR"), codeTakenMessage("Pastilha", "pt-BR"));
  assert.equal(codeTakenError("PD/1000", ITEMS, "pt-BR"), codeTakenMessage("Pastilha", "pt-BR"));
  assert.equal(codeTakenError("W 712", ITEMS, "pt-BR"), undefined);
  assert.equal(codeTakenError("NOVO-1", ITEMS, "pt-BR"), undefined);
  assert.equal(codeTakenError("", ITEMS, "pt-BR"), undefined);
  assert.equal(codeTakenError("W 712/95", ITEMS, "pt-BR", FILTER.id), undefined);
  assert.equal(codeTakenError("PD-1000", ITEMS, "pt-BR", PADS.id), undefined);
});

// Checks an original code against the other items' codes, their brands' and their original ones, compared as the
// search compares codes, and that the item being edited keeps its own.
test("Shared: an original code is checked against every code of the other items", () => {
  assert.equal(codeTakenError("030-115-561-an", ITEMS, "pt-BR"), codeTakenMessage("Filtro de óleo", "pt-BR"));
  assert.equal(codeTakenError("030115561AN", ITEMS, "pt-BR", FILTER.id), undefined);
  assert.equal(codeTakenError("fra 1000", ITEMS, "pt-BR"), codeTakenMessage("Pastilha", "pt-BR"));
});

// Reads colors as they are saved: trimmed and uppercase, with the accents of a color the stock already has when it
// is the same but for them, and empty when nothing was typed.
test("Shared: a brand's color is saved in uppercase", () => {
  assert.equal(colorInput(" preto ", []), "PRETO");
  assert.equal(colorInput("bordo", ["AZUL", "BORDÔ"]), "BORDÔ");
  assert.equal(colorInput("Cinza Grafite", ["AZUL"]), "CINZA GRAFITE");
  assert.equal(colorInput("  ", ["AZUL"]), "");
});

// Splits codes pasted at once at commas, semicolons and line breaks, trimmed and uppercase, without empty ones.
test("Shared: codes typed or pasted at once are split", () => {
  assert.deepEqual(splitCodes("5u0 698 151; 5U0-698-151-A,\r\n  ,x"), ["5U0 698 151", "5U0-698-151-A", "X"]);
  assert.deepEqual(splitCodes("  "), []);
});

// Adds codes to a list of chips and checks each joins once, as the search compares codes, uppercase and trimmed, at
// the end, and an empty one is left out.
test("Shared: a list of codes takes each code once", () => {
  assert.deepEqual(addCodes(["CB-4500"], ["cb4500", " w 712 ", "", "W712"]), ["CB-4500", "W 712"]);
  assert.deepEqual(addCodes([], []), []);
});

// Types into a field of chips and checks a comma, a semicolon or a line break typed ends a code, which joins the list,
// what comes after it stays in the field, and a paste of several codes adds them all, the last one too.
test("Shared: the code field adds a code where it ends, and every code pasted", () => {
  assert.deepEqual(codesInput([], "5u0", "5u0,"), { codes: ["5U0"], text: "" });
  assert.deepEqual(codesInput(["A"], "a", "a;"), { codes: ["A"], text: "" });
  assert.deepEqual(codesInput([], "x", "xy"), { codes: [], text: "xy" });
  assert.deepEqual(codesInput(["A"], "", "b; c\nd"), { codes: ["A", "B", "C", "D"], text: "" });
});

// Writes an item's original codes for its details, and says so when it has none.
test("Shared: the details list an item's original codes", () => {
  assert.equal(originalCodesText({ originalCodes: ["5U0 698 151", "5U0 698 151 A"] }, "pt-BR"), "5U0 698 151, 5U0 698 151 A");
  assert.equal(originalCodesText(PADS, "pt-BR"), "Nenhum");
});

// Gives the form original codes that are a brand's code in the item, another item's code and a new one, and checks
// each chip's message, that the form can't be saved with them, and that a list of codes without messages is fine.
test("Shared: an original code is refused when a brand of the item or another item has it", () => {
  const form = { ...VALID, originalCodes: ["NGK-B7", "030 115 561 AN", "NEW-1"] };
  const messages = [ITEM_FORM_MESSAGES["pt-BR"].originalCodeInBrand, codeTakenMessage("Filtro de óleo", "pt-BR"), undefined];
  assert.deepEqual(originalCodeMessages(form, ITEMS, "pt-BR"), messages);
  assert.deepEqual(itemFormErrors(form, ITEMS, LISTS, "pt-BR").originalCodes, messages);
  assert.equal(hasFormErrors(itemFormErrors(form, ITEMS, LISTS, "pt-BR")), true);
  assert.equal(hasFormErrors(itemFormErrors({ ...VALID, originalCodes: ["NEW-1"] }, ITEMS, LISTS, "pt-BR")), false);
  assert.equal(hasFormErrors({ originalCodes: [undefined] }), false);
});

// Finds the items whose photos the picker offers by any code, a brand's or an original one, ignoring separators and
// case, the exact code first; an item without photos, the item being edited and an empty search find nothing, and
// past the limit it says how many more there are.
test("Shared: the photo picker finds items with photos by code", () => {
  const photo = (id: string) => [{ id, url: `/photos/${id}.jpg`, thumbUrl: `/photos/${id}-t.webp` }];
  const disc = item({ id: "d", name: "Disco", code: "BD-3377", photos: photo("p1") });
  const pads = item({
    id: "e",
    name: "Pastilha",
    originalCodes: ["BD 33"],
    brands: [
      { id: "e1", partBrand: "Cobreq", code: "N-1", color: "N/A", location: null, quantity: 1, unitPriceCents: 100, photos: [] },
      { id: "e2", partBrand: "Fras-le", code: "N-2", color: "N/A", location: null, quantity: 1, unitPriceCents: 100, photos: photo("p2") },
    ],
  });
  const plain = item({ id: "f", name: "Sem foto", code: "BD-3378" });
  const stock = [disc, pads, plain];
  assert.deepEqual(photoSources(stock, "bd33").items.map((each) => each.id), ["e", "d"]);
  assert.deepEqual(photoSources(stock, "bd 3377").items.map((each) => each.id), ["d"]);
  assert.deepEqual(photoSources(stock, "BD", "d").items.map((each) => each.id), ["e"]);
  assert.deepEqual(photoSources(stock, " - "), { items: [], more: 0 });
  const many = Array.from({ length: PHOTO_SOURCES_LIMIT + 2 }, (_, index) =>
    item({ id: `m${index}`, name: "Peça", code: `MX-${index}`, photos: photo(`m${index}`) }),
  );
  const found = photoSources(many, "mx");
  assert.deepEqual([found.items.length, found.more], [PHOTO_SOURCES_LIMIT, 2]);
});

// Writes the picker's count and button: none, some, and full, which asks to uncheck one to change it.
test("Shared: the photo picker says how many photos are checked", () => {
  assert.deepEqual(photoPickerTexts(0, 3, "pt-BR"), { count: "0 de 3 fotos escolhidas", use: "Usar fotos" });
  assert.deepEqual(photoPickerTexts(1, 3, "pt-BR"), { count: "1 de 3 fotos escolhidas", use: "Usar 1 foto" });
  assert.deepEqual(photoPickerTexts(2, 2, "pt-BR"), { count: "2 de 2 fotos escolhidas: desmarque uma para trocar.", use: "Usar 2 fotos" });
  assert.deepEqual(photoPickerTexts(1, 1, "pt-BR"), { count: "1 de 1 foto escolhida: desmarque uma para trocar.", use: "Usar 1 foto" });
});

// Builds the body of a filled-in form and checks the writing rule: capitals on every text, uppercase codes and
// colors, an empty color as N/A, blank quantities as zero, the price in cents, and an
// edited brand sent with its id.
test("Shared: the item body follows the writing rule", () => {
  const form = withFormValues({ ...VALID, originalCodes: ["5u0 698 151 "] }, { color: "preto", location: "a-2", quantity: "3" });
  assert.deepEqual(itemFormBody(form, ["AZUL", "PRETO"]), {
    name: "Vela de ignição",
    category: "Ignição",
    vehicles: [{ vehicleBrand: "Chevrolet", vehicleModel: "" }],
    minQuantity: 0,
    position: "N/A",
    side: "N/A",
    originalCodes: ["5U0 698 151"],
    material: "",
    description: "",
    brands: [{ partBrand: "NGK", code: "NGK-B7", quantity: 3, unitPriceCents: 3490, color: "PRETO", location: "A-2" }],
  });
  assert.equal(itemFormBody(VALID, []).brands[0].color, "N/A");
  assert.deepEqual(
    itemFormBody(itemFormOf(PADS), []).brands.map((brand) => [brand.id, brand.code]),
    [
      [PADS.brands[0].id, "FRA-1000"],
      [PADS.brands[1].id, "PD-1000"],
    ],
  );
});

// Fills the form with an item of two brands to edit and checks every field, each brand with its id, the N/A color left
// blank and the price in reais, and that saving it back gives the same values.
test("Shared: an item fills the form and saves back unchanged", () => {
  const form = itemFormOf(PADS);
  assert.deepEqual(form, {
    name: "Pastilha",
    category: "Motor",
    vehicles: [{ vehicleBrand: "Chevrolet", vehicleModel: "Opala" }],
    minQuantity: "2",
    position: "N/A",
    side: "N/A",
    originalCodes: [],
    brands: [
      { id: PADS.brands[0].id, partBrand: "Bosch", code: "FRA-1000", quantity: "1", price: "R$ 39,90", color: "PRETO", location: "" },
      { id: PADS.brands[1].id, partBrand: "Fras-le", code: "PD-1000", quantity: "3", price: "R$ 49,90", color: "", location: "B-10" },
    ],
  });
  const body = itemFormBody(form, []);
  assert.deepEqual(
    body.brands.map((brand) => [brand.unitPriceCents, brand.color]),
    PADS.brands.map((brand) => [brand.unitPriceCents, brand.color]),
  );
});

// Copies an item of two brands that fits two vehicles and has an original code, and checks the copy keeps every field,
// the vehicles and the brands in their order, each a new brand without its code and with its quantity at 0, and leaves
// the original codes out.
test("Shared: a duplicated item keeps every field but the codes, with no stock", () => {
  const fits = { ...PADS, originalCodes: ["93 234 567"], vehicles: [...PADS.vehicles, { vehicleBrand: "Ford", vehicleModel: null }] };
  assert.deepEqual(duplicateForm(fits), {
    name: "Pastilha",
    category: "Motor",
    vehicles: [
      { vehicleBrand: "Chevrolet", vehicleModel: "Opala" },
      { vehicleBrand: "Ford", vehicleModel: "" },
    ],
    minQuantity: "2",
    position: "N/A",
    side: "N/A",
    originalCodes: [],
    brands: [
      { partBrand: "Bosch", code: "", quantity: "0", price: "R$ 39,90", color: "PRETO", location: "" },
      { partBrand: "Fras-le", code: "", quantity: "0", price: "R$ 49,90", color: "", location: "B-10" },
    ],
  });
});

// Fills the form with an item and checks it is no change as it is, nor with fields only written differently (the name
// in lowercase, the price without its last zero), and is one once a quantity changes, a brand is added or one is
// removed, or an original code is added.
test("Shared: an edit only changes the item when what is sent differs", () => {
  const form = itemFormOf(PADS);
  assert.equal(itemFormChanged(form, PADS, []), false);
  assert.equal(itemFormChanged(withFormValues({ ...form, name: "pastilha" }, { price: "39,9" }), PADS, []), false);
  assert.equal(itemFormChanged(withFormValues(form, { quantity: "7" }), PADS, []), true);
  assert.equal(itemFormChanged({ ...form, brands: [...form.brands, EMPTY_BRAND_FORM] }, PADS, []), true);
  assert.equal(itemFormChanged({ ...form, brands: form.brands.slice(1) }, PADS, []), true);
  assert.equal(itemFormChanged({ ...form, originalCodes: ["5U0 698 151"] }, PADS, []), true);
});

// Lists the options and checks the comboboxes offer every name of the lists, sorted, the colors are the ones the
// brands in stock use without N/A, and the models are those of the chosen vehicle brand, ignoring case, with none
// before a brand of the list.
test("Shared: the form's options come from the lists", () => {
  assert.deepEqual(itemFormOptions(ITEMS, LISTS), {
    categories: ["Ignição", "Motor"],
    partBrands: ["Bosch", "NGK"],
    vehicleBrands: ["Chevrolet", "Volkswagen"],
    colors: ["AZUL", "PRETO"],
  });
  assert.deepEqual(modelsOfBrand(LISTS, "VOLKSWAGEN"), ["Gol", "Santana"]);
  assert.deepEqual(modelsOfBrand(LISTS, "Fiat"), []);
  assert.deepEqual(modelsOfBrand(LISTS, " "), []);
});

// Writes out the details of an item with every field filled in and of one with nothing optional, and checks the
// position and side by their full names, each brand's price in reais, what doesn't apply or is missing said in
// words, and a text for every labeled field, in the form's order.
test("Shared: an item's details are written out field by field", () => {
  const full = itemDetailTexts({ ...PADS, position: "D", side: "LE" }, "pt-BR");
  assert.deepEqual(full, {
    name: "Pastilha",
    category: "Motor",
    position: "Dianteiro",
    side: "Lado esquerdo",
    minQuantity: "2",
  });
  assert.deepEqual(Object.keys(full), Object.keys(ITEM_FIELD_LABELS["pt-BR"]));
  const brand = brandDetailTexts({ ...PADS.brands[0], location: "B-10", unitPriceCents: 123456 }, "pt-BR");
  assert.deepEqual({ ...brand, price: brand.price.replace(/\s/g, " ") }, {
    partBrand: "Bosch",
    code: "FRA-1000",
    quantity: "1",
    price: "R$ 1.234,56",
    color: "PRETO",
    location: "B-10",
  });
  assert.deepEqual(Object.keys(brand), Object.keys(BRAND_FIELD_LABELS["pt-BR"]));
  assert.equal(
    vehiclesText({ vehicles: [{ vehicleBrand: "Chevrolet", vehicleModel: "Opala" }, { vehicleBrand: "Volkswagen", vehicleModel: null }] }, "pt-BR"),
    "Chevrolet Opala, Volkswagen (qualquer modelo)",
  );
  const bare = itemDetailTexts(FILTER, "pt-BR");
  assert.equal(bare.position, "Não se aplica");
  assert.equal(bare.side, "Não se aplica");
  const plain = brandDetailTexts(FILTER.brands[0], "pt-BR");
  assert.equal(plain.color, "Não se aplica");
  assert.equal(plain.location, "Não informado");
});

// Words the position and side on one line and where a brand is kept, as a phone's details show them: both, one alone,
// or neither; the location with the color, without a color that doesn't apply, and with no location.
test("Shared: a phone's details write the position, the side and a brand's place in short", () => {
  assert.equal(positionSideText({ position: "D", side: "LE" }, "pt-BR"), "Dianteiro · Lado esquerdo");
  assert.equal(positionSideText({ position: "N/A", side: "Ambos" }, "pt-BR"), "Os dois lados");
  assert.equal(positionSideText({ position: "N/A", side: "N/A" }, "pt-BR"), "Não se aplica");
  assert.equal(brandPlaceText({ location: "E-1", color: "Preto" }, "pt-BR"), "Local E-1 · Preto");
  assert.equal(brandPlaceText({ location: "E-1", color: "N/A" }, "pt-BR"), "Local E-1");
  assert.equal(brandPlaceText({ location: null, color: "N/A" }, "pt-BR"), "Sem local");
});

// Reads and writes the form's fields flat, the item's, its first brand's and its first vehicle's, as the tutorial names
// them, leaving the other brands and vehicles as they are.
test("Shared: the form's fields read and write flat, the first brand's for a brand field", () => {
  const form = { ...itemFormOf(PADS), vehicles: [...itemFormOf(PADS).vehicles, { vehicleBrand: "Ford", vehicleModel: "Escort" }] };
  assert.deepEqual([formValue(form, "name"), formValue(form, "code"), formValue(form, "price")], ["Pastilha", "FRA-1000", "R$ 39,90"]);
  assert.deepEqual([formValue(form, "vehicleBrand"), formValue(form, "vehicleModel")], ["Chevrolet", "Opala"]);
  const changed = withFormValues(form, { name: "Junta", quantity: "9", vehicleModel: "Caravan" });
  assert.equal(changed.name, "Junta");
  assert.equal(changed.brands[0].quantity, "9");
  assert.deepEqual(changed.brands[1], form.brands[1]);
  assert.deepEqual(changed.vehicles, [
    { vehicleBrand: "Chevrolet", vehicleModel: "Caravan" },
    { vehicleBrand: "Ford", vehicleModel: "Escort" },
  ]);
});
