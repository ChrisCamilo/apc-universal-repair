import {
  allCodes,
  capitalizeFirst,
  codeKey,
  findOption,
  formatPrice,
  MAX_PRICE_CENTS,
  MAX_QUANTITY,
  NOT_APPLICABLE,
  optionKey,
  POSITION_NAMES,
  searchKey,
  SIDE_NAMES,
  UNIVERSAL_BRAND,
  vehicleKey,
  vehicleLabel,
  type Item,
  type ItemBrand,
  type ItemCreate,
  type POSITIONS,
  type SIDES,
} from "./items.ts";
import { findEntry, type ItemLists } from "../lists/lists.ts";

// The item form shared by web and mobile, for creating and editing an inventory item: what the item's brands share
// (name, category, the vehicles it fits, each a vehicle brand with its model or any model, position, side, minimum
// stock, and the vehicle maker's original codes, typed as chips: a
// code added with Enter or a comma, or several pasted at once, once each) and a section for each brand that makes the part (part
// brand, code, quantity, unit price, color, location), as typed, the unit price always formatted in reais ("R$
// 1.234,56"), a dot and a comma meaning the same; the message of each field that can't be saved, the body sent to the
// API with the writing rule applied, and the options the comboboxes offer, taken from the lists the API keeps.
// Category, part brands, vehicle brands and vehicle models must be in their lists, where the form creates new names; a
// vehicle appears once in an item, and Universal (any vehicle) alone; a
// part brand and a code appear once in an item, original or a brand's, and a code nowhere else in stock. The same form shows an item's
// details for reading, each field written out as text.

/** A new brand's section: every field blank. */
export const EMPTY_BRAND_FORM: ItemBrandForm = { partBrand: "", code: "", quantity: "", price: "", color: "", location: "" };
/** A new vehicle's line: its brand and model blank. */
export const EMPTY_VEHICLE_FORM: ItemVehicleForm = { vehicleBrand: "", vehicleModel: "" };
/** The empty form of a new item: every field blank, position and side on N/A, one blank vehicle and one blank brand. */
export const EMPTY_ITEM_FORM: ItemForm = {
  name: "",
  category: "",
  vehicles: [EMPTY_VEHICLE_FORM],
  position: NOT_APPLICABLE,
  side: NOT_APPLICABLE,
  minQuantity: "",
  originalCodes: [],
  brands: [EMPTY_BRAND_FORM],
};
/** Label of each field of a brand's section, in the order the form shows them. */
export const BRAND_FIELD_LABELS: Record<BrandField, string> = {
  partBrand: "Marca da peça",
  code: "Código da peça",
  quantity: "Quantidade",
  price: "Valor unitário (R$)",
  color: "Cor",
  location: "Local",
};
/** Label of each field the item's brands share, in the order the form shows them. */
export const ITEM_FIELD_LABELS: Record<ItemField, string> = {
  name: "Nome",
  category: "Categoria",
  position: "Posição",
  side: "Lado",
  minQuantity: "Quantidade mínima",
};
/** Label of each field of a vehicle's line. */
export const VEHICLE_FIELD_LABELS: Record<VehicleField, string> = {
  vehicleBrand: "Marca do veículo",
  vehicleModel: "Modelo do veículo",
};
/** Label of the item's vehicles, in the form and the details. */
export const VEHICLES_LABEL = "Veículos";
/** What splits codes typed or pasted at once: commas, semicolons and line breaks. */
const CODE_SEPARATORS = /[,;\r\n]/;
/** Message under each field that can't be saved as it is. */
export const ITEM_FORM_MESSAGES = {
  code: "Informe o código da peça.",
  codeRepeated: "Esse código já está em outra marca deste item.",
  name: "Informe o nome do item.",
  category: "Informe a categoria.",
  categoryNotListed: "Categoria não cadastrada. Escolha “+ Criar categoria” na lista.",
  partBrand: "Informe a marca da peça.",
  partBrandNotListed: "Marca de peça não cadastrada. Escolha “+ Criar marca” na lista.",
  partBrandRepeated: "Essa marca já está neste item.",
  originalCodeInBrand: "Esse código já está numa marca deste item.",
  vehicleBrand: "Informe a marca do veículo.",
  vehicleBrandNotListed: "Marca de veículo não cadastrada. Escolha “+ Criar marca” na lista.",
  vehicleModelNotListed: "Modelo não cadastrado para essa marca. Escolha “+ Criar modelo” na lista.",
  vehicleRepeated: "Esse veículo já está neste item.",
  universalAlone: "Universal serve em qualquer veículo: deixe só ele na lista.",
  quantityInvalid: "Use um número inteiro, de 0 em diante.",
  quantityTooHigh: `Informe no máximo ${MAX_QUANTITY.toLocaleString("pt-BR")}.`,
  price: "Informe o valor unitário.",
  priceInvalid: "Informe um valor maior que zero, como 89,90.",
  priceTooHigh: `Informe no máximo ${formatPrice(MAX_PRICE_CENTS).replace(/\s/, " ")}.`,
} as const;
/** The info toast of an edit saved with nothing changed, which isn't sent. */
export const ITEM_UNCHANGED_MESSAGE = "Nenhuma alteração para salvar.";
/** Label of the item's original codes, in the form and the details. */
export const ORIGINAL_CODES_LABEL = "Códigos originais";
/** What the empty price field shows. */
export const PRICE_PLACEHOLDER = "R$ 0,00";

/** A field of a brand's section. */
export type BrandField = Exclude<keyof ItemBrandForm, "id">;
/** A field of the form, the item's, a brand's or a vehicle's, as the tutorial and the details name them. */
export type FormField = ItemField | BrandField | VehicleField;
/** A brand's section as typed: on an edit, with the id of the brand it is. */
export type ItemBrandForm = {
  id?: string;
  partBrand: string;
  code: string;
  quantity: string;
  price: string;
  color: string;
  location: string;
};
/** The message of each field of a brand's section that can't be saved; a field without one is fine. */
export type ItemBrandFormErrors = Partial<Record<"partBrand" | "code" | "quantity" | "price", string>>;
/** A field the item's brands share, written as one text or chosen. */
export type ItemField = Exclude<keyof ItemForm, "brands" | "originalCodes" | "vehicles">;
/**
 * The item form as typed: every field as text, except position and side, which are chosen, the original codes, a
 * list, and its vehicles and brands.
 */
export type ItemForm = {
  name: string;
  category: string;
  vehicles: ItemVehicleForm[];
  position: (typeof POSITIONS)[number];
  side: (typeof SIDES)[number];
  minQuantity: string;
  /** The vehicle maker's original codes, uppercase, each once. */
  originalCodes: string[];
  brands: ItemBrandForm[];
};
/**
 * The message of each field that can't be saved, the item's, each original code's and each brand's, in their order; a
 * field without one is fine.
 */
export type ItemFormErrors = Partial<Record<"name" | "category" | "minQuantity", string>> & {
  vehicles?: ItemVehicleFormErrors[];
  originalCodes?: (string | undefined)[];
  brands?: ItemBrandFormErrors[];
};
/** A vehicle's line as typed: its brand, and its model, empty for any model of the brand. */
export type ItemVehicleForm = { vehicleBrand: string; vehicleModel: string };
/** The message of each field of a vehicle's line that can't be saved; a field without one is fine. */
export type ItemVehicleFormErrors = Partial<Record<VehicleField, string>>;
/** The options of the item form's comboboxes, from the lists, and its color, from the brands in stock. */
export type ItemFormOptions = { categories: string[]; partBrands: string[]; vehicleBrands: string[]; colors: string[] };

/**
 * Adds codes to a list of codes, uppercase and trimmed, leaving out the empty ones and those the list already has, as
 * the search compares codes (see codeKey), so "cb-4500" is "CB4500".
 * @param held The list's codes.
 * @param typed The codes to add, e.g. from splitCodes.
 * @returns The list with the new codes at its end.
 */
export function addCodes(held: readonly string[], typed: readonly string[]): string[] {
  const codes = [...held];
  for (const code of typed.map((each) => each.trim().toUpperCase())) {
    if (codeKey(code) && !codes.some((other) => codeKey(other) === codeKey(code))) {
      codes.push(code);
    }
  }
  return codes;
}

/** A field of a vehicle's line. */
export type VehicleField = keyof ItemVehicleForm;

/**
 * Writes out each field of a brand for an item's details, read-only: what doesn't apply or wasn't filled in is said
 * in words, and the unit price in reais.
 * @param brand The brand.
 * @returns The text of each field of a brand's section.
 */
export function brandDetailTexts(brand: ItemBrand): Record<BrandField, string> {
  return {
    partBrand: brand.partBrand,
    code: brand.code,
    quantity: String(brand.quantity),
    price: formatPrice(brand.unitPriceCents),
    color: brand.color === NOT_APPLICABLE ? "Não se aplica" : brand.color,
    location: brand.location ?? "Não informado",
  };
}

/**
 * Checks a part code against the other items' codes, their brands' and their original ones, as it is typed: the
 * message when another item uses it, compared as the search compares codes (see codeKey), so "cb4500" is "CB-4500";
 * nothing when it is free or still empty.
 * @param code The code as typed.
 * @param items Every item in stock.
 * @param editingId The id of the item being edited, which may keep its own codes.
 * @returns E.g. "Código já usado em “Filtro de óleo”.", or undefined.
 */
export function codeTakenError(code: string, items: readonly Item[], editingId?: string): string | undefined {
  const typed = codeKey(code);
  const owner = typed ? items.find((item) => item.id !== editingId && allCodes(item).some((held) => codeKey(held) === typed)) : undefined;
  return owner && codeTakenMessage(owner.name);
}

/**
 * Says a part code is already used, naming the item that uses it.
 * @param name The other item's name.
 * @returns E.g. "Código já usado em “Filtro de óleo”."
 */
export function codeTakenMessage(name: string): string {
  return `Código já usado em “${name}”.`;
}

/**
 * Reads a change to a field of codes typed as chips: each code a comma, a semicolon or a line break ends joins the
 * list (see addCodes), and what is typed after the last one stays in the field to go on typing; a paste of several
 * codes adds them all.
 * @param held The list's codes.
 * @param text What the field held before the change.
 * @param typed The field's text after the change.
 * @returns The list's codes, and what the field keeps.
 */
export function codesInput(held: readonly string[], text: string, typed: string): { codes: string[]; text: string } {
  if (!CODE_SEPARATORS.test(typed)) {
    return { codes: [...held], text: typed };
  }
  const parts = typed.split(CODE_SEPARATORS);
  // More than one character came in at once: a paste, whose last code is whole too.
  const pasted = typed.length > text.length + 1;
  const rest = pasted ? "" : parts.pop()!;
  return { codes: addCodes(held, parts), text: rest.trimStart() };
}

/**
 * Keeps one of each value, ignoring case and accents (the first spelling found), sorted.
 * @param values Values, possibly repeated.
 * @returns The distinct values in alphabetical order.
 */
export function distinct(values: readonly string[]): string[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    if (!seen.has(searchKey(value))) {
      seen.set(searchKey(value), value);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/**
 * Reads a field of the form: the item's, or its first brand's or first vehicle's, as the tutorial names them.
 * @param form The form as typed.
 * @param field The field.
 * @returns Its value as typed.
 */
export function formValue(form: ItemForm, field: FormField): string {
  if (field in BRAND_FIELD_LABELS) {
    return form.brands[0][field as BrandField];
  }
  return field in VEHICLE_FIELD_LABELS ? form.vehicles[0][field as VehicleField] : form[field as ItemField];
}

/**
 * Tells whether a form's messages keep it from being saved.
 * @param errors The messages, from itemFormErrors.
 * @returns True when a field of the item or of a brand has one.
 */
export function hasFormErrors(errors: ItemFormErrors): boolean {
  const { brands = [], vehicles = [], originalCodes = [], ...item } = errors;
  return (
    Object.values(item).some(Boolean) ||
    originalCodes.some(Boolean) ||
    [...vehicles, ...brands].some((line) => Object.values(line).some(Boolean))
  );
}

/**
 * Writes out each field the item's brands share for its details, read-only: what doesn't apply or wasn't filled in
 * is said in words, and the position and side by their full names; the vehicles come from vehiclesText, and each
 * brand's fields from brandDetailTexts.
 * @param item The item.
 * @returns The text of each field of the item.
 */
export function itemDetailTexts(item: Item): Record<ItemField, string> {
  const notApplicable = "Não se aplica";
  return {
    name: item.name,
    category: item.category,
    position: item.position === NOT_APPLICABLE ? notApplicable : POSITION_NAMES[item.position],
    side: item.side === NOT_APPLICABLE ? notApplicable : SIDE_NAMES[item.side],
    minQuantity: String(item.minQuantity),
  };
}

/**
 * Builds the body sent to the API: every text starts with a capital letter, codes are uppercase, a color that
 * already exists takes its spelling and an empty one is N/A, and blank quantities are zero.
 * @param form The form, already checked with itemFormErrors.
 * @param colors The colors already in stock.
 * @returns The create (or full edit) body, each brand kept on an edit with its id.
 */
export function itemFormBody(form: ItemForm, colors: readonly string[]): ItemCreate {
  return {
    name: capitalizeFirst(form.name),
    category: capitalizeFirst(form.category),
    vehicles: form.vehicles.map((vehicle) => ({
      vehicleBrand: capitalizeFirst(vehicle.vehicleBrand),
      vehicleModel: vehicle.vehicleModel.trim() ? capitalizeFirst(vehicle.vehicleModel) : "",
    })),
    position: form.position,
    side: form.side,
    minQuantity: Number(form.minQuantity || 0),
    originalCodes: form.originalCodes.map((code) => code.trim().toUpperCase()),
    brands: form.brands.map((brand) => ({
      ...(brand.id && { id: brand.id }),
      partBrand: capitalizeFirst(brand.partBrand),
      code: brand.code.trim().toUpperCase(),
      quantity: Number(brand.quantity || 0),
      unitPriceCents: parsePrice(brand.price) ?? 0,
      color: brand.color.trim() ? (findOption(colors, brand.color) ?? capitalizeFirst(brand.color)) : NOT_APPLICABLE,
      location: brand.location.trim() ? capitalizeFirst(brand.location) : "",
    })),
  };
}

/**
 * Tells whether an edit changes the item, comparing what would be sent with what the item holds, so a field only
 * written differently (a name in lowercase, the price as "39,9") is no change.
 * @param form The form as typed.
 * @param item The item being edited.
 * @param colors The colors already in stock.
 * @returns True when saving would change the item or its brands.
 */
export function itemFormChanged(form: ItemForm, item: Item, colors: readonly string[]): boolean {
  return JSON.stringify(itemFormBody(form, colors)) !== JSON.stringify(itemFormBody(itemFormOf(item), colors));
}

/**
 * Checks the form before saving: the name, category, each vehicle's brand and each brand's part brand, code and unit
 * price are required; the category, the brands, the vehicle brands and a vehicle model must be in their lists, a
 * vehicle appears once in the item and Universal alone; a part brand and a code appear
 * once in the item; the quantities can't pass MAX_QUANTITY, the price must be a number above zero and up to
 * MAX_PRICE_CENTS, and a code can't be one another item uses (see codeTakenError); an original code can't be a code
 * of one of the item's brands either (see originalCodeMessages).
 * @param form The form as typed.
 * @param items Every item in stock.
 * @param lists The lists the API keeps.
 * @param editingId The id of the item being edited, whose brands may keep their own codes.
 * @returns The message of each field that can't be saved, in form order; without any when the item can be saved.
 */
export function itemFormErrors(form: ItemForm, items: readonly Item[], lists: ItemLists, editingId?: string): ItemFormErrors {
  /** The message of a list field: required when empty, or not listed when its list doesn't hold it. */
  const listed = (text: string, entries: ItemLists["categories"], required: string | undefined, notListed: string) =>
    !text.trim() ? required : findEntry(entries, text) ? undefined : notListed;
  const category = listed(form.category, lists.categories, ITEM_FORM_MESSAGES.category, ITEM_FORM_MESSAGES.categoryNotListed);
  const vehicles = form.vehicles.map((each, index): ItemVehicleFormErrors => {
    const brand = findEntry(lists.vehicleBrands, each.vehicleBrand);
    const universal = form.vehicles.length > 1 && optionKey(each.vehicleBrand) === optionKey(UNIVERSAL_BRAND);
    const vehicleBrand = universal
      ? ITEM_FORM_MESSAGES.universalAlone
      : listed(each.vehicleBrand, lists.vehicleBrands, ITEM_FORM_MESSAGES.vehicleBrand, ITEM_FORM_MESSAGES.vehicleBrandNotListed);
    // A model is checked within a listed brand; without one, the brand's message says what to do first.
    const brandModels = brand ? lists.vehicleModels.filter((model) => model.vehicleBrandId === brand.id) : [];
    const repeated =
      each.vehicleBrand.trim() !== "" && form.vehicles.slice(0, index).some((other) => vehicleKey(other) === vehicleKey(each));
    const vehicleModel = repeated
      ? ITEM_FORM_MESSAGES.vehicleRepeated
      : brand && listed(each.vehicleModel, brandModels, undefined, ITEM_FORM_MESSAGES.vehicleModelNotListed);
    return { ...(vehicleBrand && { vehicleBrand }), ...(vehicleModel && { vehicleModel }) };
  });
  /** Whether an earlier brand of the form has the same value, compared by a key. */
  const repeated = (index: number, key: (brand: ItemBrandForm) => string) =>
    key(form.brands[index]) !== "" && form.brands.slice(0, index).some((other) => key(other) === key(form.brands[index]));
  const brands = form.brands.map((each, index): ItemBrandFormErrors => {
    const price = parsePrice(each.price);
    const codeTaken = codeTakenError(each.code, items, editingId);
    const partBrand = repeated(index, (other) => optionKey(other.partBrand))
      ? ITEM_FORM_MESSAGES.partBrandRepeated
      : listed(each.partBrand, lists.partBrands, ITEM_FORM_MESSAGES.partBrand, ITEM_FORM_MESSAGES.partBrandNotListed);
    return {
      ...(partBrand && { partBrand }),
      ...(!each.code.trim()
        ? { code: ITEM_FORM_MESSAGES.code }
        : repeated(index, (other) => codeKey(other.code))
          ? { code: ITEM_FORM_MESSAGES.codeRepeated }
          : codeTaken
            ? { code: codeTaken }
            : {}),
      ...(Number(each.quantity) > MAX_QUANTITY && { quantity: ITEM_FORM_MESSAGES.quantityTooHigh }),
      ...(!each.price.trim()
        ? { price: ITEM_FORM_MESSAGES.price }
        : price === null || price <= 0
          ? { price: ITEM_FORM_MESSAGES.priceInvalid }
          : price > MAX_PRICE_CENTS
            ? { price: ITEM_FORM_MESSAGES.priceTooHigh }
            : {}),
    };
  });
  const originalCodes = originalCodeMessages(form, items, editingId);
  return {
    ...(!form.name.trim() && { name: ITEM_FORM_MESSAGES.name }),
    ...(category && { category }),
    ...(vehicles.some((each) => Object.keys(each).length > 0) && { vehicles }),
    ...(Number(form.minQuantity) > MAX_QUANTITY && { minQuantity: ITEM_FORM_MESSAGES.quantityTooHigh }),
    ...(originalCodes.some(Boolean) && { originalCodes }),
    ...(brands.some((each) => Object.keys(each).length > 0) && { brands }),
  };
}

/**
 * Fills the form with an item to edit, each brand with its id and its unit price written in reais.
 * @param item The item.
 * @returns The form with its values.
 */
export function itemFormOf(item: Item): ItemForm {
  return {
    name: item.name,
    category: item.category,
    vehicles: item.vehicles.map((vehicle) => ({ vehicleBrand: vehicle.vehicleBrand, vehicleModel: vehicle.vehicleModel ?? "" })),
    position: item.position,
    side: item.side,
    minQuantity: String(item.minQuantity),
    originalCodes: [...item.originalCodes],
    brands: item.brands.map((brand) => ({
      id: brand.id,
      partBrand: brand.partBrand,
      code: brand.code,
      quantity: String(brand.quantity),
      price: priceText(brand.unitPriceCents),
      color: brand.color === NOT_APPLICABLE ? "" : brand.color,
      location: brand.location ?? "",
    })),
  };
}

/**
 * Lists the options of the item form's comboboxes, from the lists, and the colors the brands in stock use.
 * @param items Every item in stock.
 * @param lists The lists the API keeps.
 * @returns Categories, part brands, vehicle brands and colors (without N/A), each sorted.
 */
export function itemFormOptions(items: readonly Item[], lists: ItemLists): ItemFormOptions {
  const names = (entries: ItemLists["categories"]) => distinct(entries.map((entry) => entry.name));
  return {
    categories: names(lists.categories),
    partBrands: names(lists.partBrands),
    vehicleBrands: names(lists.vehicleBrands),
    colors: distinct(items.flatMap((item) => item.brands.map((brand) => brand.color)).filter((color) => color !== NOT_APPLICABLE)),
  };
}

/**
 * Lists the vehicle models of a vehicle brand, for the form's model combobox.
 * @param lists The lists the API keeps.
 * @param vehicleBrand The chosen vehicle brand, matched ignoring case, accents and extra spaces.
 * @returns Its models, sorted; none while the brand isn't one of the list.
 */
export function modelsOfBrand(lists: ItemLists, vehicleBrand: string): string[] {
  const brand = findEntry(lists.vehicleBrands, vehicleBrand);
  return brand ? distinct(lists.vehicleModels.filter((model) => model.vehicleBrandId === brand.id).map((model) => model.name)) : [];
}

/**
 * Checks each original code of the form, as its chip shows it: the message when one of the item's brands has it, or
 * when another item uses it (see codeTakenError).
 * @param form The form as typed.
 * @param items Every item in stock.
 * @param editingId The id of the item being edited, which may keep its own codes.
 * @returns The message of each original code, in their order, undefined for a code that is fine.
 */
export function originalCodeMessages(form: ItemForm, items: readonly Item[], editingId?: string): (string | undefined)[] {
  return form.originalCodes.map((code) =>
    form.brands.some((brand) => codeKey(brand.code) !== "" && codeKey(brand.code) === codeKey(code))
      ? ITEM_FORM_MESSAGES.originalCodeInBrand
      : codeTakenError(code, items, editingId),
  );
}

/**
 * Writes an item's original codes for its details.
 * @param item The item.
 * @returns E.g. "5U0 698 151, 5U0 698 151 A", or "Nenhum" when it has none.
 */
export function originalCodesText(item: Pick<Item, "originalCodes">): string {
  return item.originalCodes.length > 0 ? item.originalCodes.join(", ") : "Nenhum";
}

/**
 * Reads a price as typed, pasted or written in a spreadsheet, a dot and a comma meaning the same: the last one,
 * followed by one or two digits, comes before the cents, and any other one goes between thousands, followed by three
 * digits; an "R$" is optional.
 * @param text The price, e.g. "1.234,56", "1,234.56", "7.50", "89,9", "1.500" or "R$ 12".
 * @returns The price in cents, or null when it isn't a price (e.g. "1,2,3" or "1.23,00").
 */
export function parsePrice(text: string): number | null {
  const typed = text.replace(/R\$/i, "").trim();
  const parts = /^(\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,](\d{1,2}))?$/.exec(typed);
  if (!parts) {
    return null;
  }
  const [, reais, cents = ""] = parts;
  return Number(reais.replace(/[.,]/g, "")) * 100 + Number(cents.padEnd(2, "0"));
}

/**
 * Writes a price in cents in the Brazilian format without the currency sign, as the CSV holds it.
 * @param cents Price in cents.
 * @returns E.g. "1.234,56".
 */
export function priceInput(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Reads a change to the price field, which always shows the price formatted in reais. A digit typed or erased shifts
 * the digits, filling from the cents ("750" is "R$ 7,50"), and any other character typed is left out; a paste is read
 * as a price (see parsePrice), so "7.50" and "7,50" are the same. Past MAX_PRICE_CENTS, a digit typed is left out and
 * a paste is refused, saying so, as is a paste that isn't a price; the field keeps what it held.
 * @param held What the field holds, e.g. "R$ 7,50", or empty.
 * @param typed The field's text after the change.
 * @returns What the field takes, empty for a price of zero, and why the change was refused, if it was.
 */
export function priceMask(held: string, typed: string): { value: string; message?: string } {
  const text = (cents: number) => (cents ? priceText(cents) : "");
  // One character typed or erased: taking one character out of the longer text gives the shorter.
  const [longer, shorter] = typed.length > held.length ? [typed, held] : [held, typed];
  const oneChar =
    longer.length === shorter.length + 1 && [...longer].some((_, at) => longer.slice(0, at) + longer.slice(at + 1) === shorter);
  if (oneChar) {
    const cents = Number(typed.replace(/\D/g, "") || 0);
    return { value: cents > MAX_PRICE_CENTS ? held : text(cents) };
  }
  if (!typed.trim()) {
    return { value: "" };
  }
  const cents = parsePrice(typed);
  if (cents === null) {
    return { value: held, message: ITEM_FORM_MESSAGES.priceInvalid };
  }
  return cents > MAX_PRICE_CENTS ? { value: held, message: ITEM_FORM_MESSAGES.priceTooHigh } : { value: text(cents) };
}

/**
 * Writes a price in cents for the price field.
 * @param cents Price in cents.
 * @returns E.g. "R$ 1.234,56".
 */
export function priceText(cents: number): string {
  return `R$ ${priceInput(cents)}`;
}

/**
 * Reads a change to a quantity field, which takes whole numbers from 0 up: digits are taken without leading zeros, and
 * a whole number with dots between thousands without its dots ("1.000"); one other character typed is left out, and
 * any other paste (a fraction, a sign, text) is refused with a message, the field keeping what it held.
 * @param held What the field holds, digits only.
 * @param typed The field's text after the change.
 * @returns What the field takes, and why the change was refused, if it was.
 */
export function quantityInput(held: string, typed: string): { value: string; message?: string } {
  const text = typed.trim();
  if (/^(\d*|\d{1,3}(\.\d{3})+)$/.test(text)) {
    return { value: text.replace(/\./g, "").replace(/^0+(?=\d)/, "") };
  }
  // One character typed among the digits held, e.g. "12," from "12".
  const oneTyped = typed.length === held.length + 1 && typed.replace(/\D/g, "") === held;
  return oneTyped ? { value: held } : { value: held, message: ITEM_FORM_MESSAGES.quantityInvalid };
}

/**
 * Splits codes typed or pasted at once, at commas, semicolons and line breaks.
 * @param text E.g. "5U0 698 151; 5U0 698 151 A".
 * @returns The codes, trimmed and uppercase, without empty ones, e.g. ["5U0 698 151", "5U0 698 151 A"].
 */
export function splitCodes(text: string): string[] {
  return text
    .split(CODE_SEPARATORS)
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
}

/**
 * Writes out each vehicle an item fits for its details.
 * @param item The item.
 * @returns E.g. "Volkswagen Gol G5, Volkswagen (qualquer modelo)".
 */
export function vehiclesText(item: Pick<Item, "vehicles">): string {
  return item.vehicles.map((vehicle) => (vehicle.vehicleModel ? vehicleLabel(vehicle) : `${vehicle.vehicleBrand} (qualquer modelo)`)).join(", ");
}

/**
 * Writes some fields into a form: the item's, or its first brand's or first vehicle's, as the tutorial names them.
 * @param form The form as typed.
 * @param values The fields to write, e.g. { name: "Junta", quantity: "1" }.
 * @returns A new form with the values.
 */
export function withFormValues(form: ItemForm, values: Partial<Record<FormField, string>>): ItemForm {
  const entries = Object.entries(values) as [FormField, string][];
  /** The values of one kind of field. */
  const of = (labels: object) => Object.fromEntries(entries.filter(([field]) => field in labels));
  const item = Object.fromEntries(entries.filter(([field]) => !(field in BRAND_FIELD_LABELS) && !(field in VEHICLE_FIELD_LABELS)));
  const [first, ...others] = form.brands;
  const [vehicle, ...moreVehicles] = form.vehicles;
  return {
    ...form,
    ...item,
    vehicles: [{ ...vehicle, ...of(VEHICLE_FIELD_LABELS) }, ...moreVehicles],
    brands: [{ ...first, ...of(BRAND_FIELD_LABELS) }, ...others],
  };
}
