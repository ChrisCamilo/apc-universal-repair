import {
  capitalizeFirst,
  findOption,
  formatPrice,
  NOT_APPLICABLE,
  POSITION_NAMES,
  searchKey,
  SIDE_NAMES,
  type Item,
  type ItemCreate,
  type POSITIONS,
  type SIDES,
} from "./items.ts";

// The item form shared by web and mobile, for creating and editing an inventory item: the fields as typed, the
// unit price in the Brazilian format ("1.234,56"), the message of each field that can't be saved, the body sent to
// the API with the writing rule applied, and the options the comboboxes offer, taken from the items in stock. The
// same form shows an item's details for reading, each field written out as text.

/** The empty form of a new item: every field blank, position and side on N/A. */
export const EMPTY_ITEM_FORM: ItemForm = {
  code: "",
  name: "",
  category: "",
  partBrand: "",
  vehicleBrand: "",
  vehicleModel: "",
  quantity: "",
  minQuantity: "",
  position: NOT_APPLICABLE,
  side: NOT_APPLICABLE,
  color: "",
  location: "",
  price: "",
};
/** Label of each field of the item form, in the order the form shows them. */
export const ITEM_FIELD_LABELS: Record<keyof ItemForm, string> = {
  code: "Código da peça",
  name: "Nome",
  category: "Categoria",
  partBrand: "Marca da peça",
  vehicleBrand: "Marca do veículo",
  vehicleModel: "Modelo do veículo",
  quantity: "Quantidade",
  minQuantity: "Quantidade mínima",
  position: "Posição",
  side: "Lado",
  color: "Cor",
  location: "Local",
  price: "Valor unitário (R$)",
};
/** Message under each field that can't be saved as it is. */
export const ITEM_FORM_MESSAGES = {
  code: "Informe o código da peça.",
  name: "Informe o nome do item.",
  category: "Informe a categoria.",
  partBrand: "Informe a marca da peça.",
  vehicleBrand: "Informe a marca do veículo.",
  price: "Informe o valor unitário.",
  priceInvalid: "Informe um valor maior que zero, como 89,90.",
} as const;

/** The item form as typed: every field as text, except position and side, which are chosen. */
export type ItemForm = {
  code: string;
  name: string;
  category: string;
  partBrand: string;
  vehicleBrand: string;
  vehicleModel: string;
  quantity: string;
  minQuantity: string;
  position: (typeof POSITIONS)[number];
  side: (typeof SIDES)[number];
  color: string;
  location: string;
  price: string;
};
/** The message of each field that can't be saved; a field without one is fine. */
export type ItemFormErrors = Partial<Record<"code" | "name" | "category" | "partBrand" | "vehicleBrand" | "price", string>>;
/** The options of the item form's comboboxes and its color, from the items in stock. */
export type ItemFormOptions = { categories: string[]; partBrands: string[]; vehicleBrands: string[]; colors: string[] };

/**
 * Says a part code is already used, naming the item that uses it.
 * @param name The other item's name.
 * @returns E.g. "Código já usado em “Filtro de óleo”."
 */
export function codeTakenMessage(name: string): string {
  return `Código já usado em “${name}”.`;
}

/**
 * Keeps one of each value, ignoring case and accents (the first spelling found), sorted.
 * @param values Values, possibly repeated.
 * @returns The distinct values in alphabetical order.
 */
function distinct(values: readonly string[]): string[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    if (!seen.has(searchKey(value))) {
      seen.set(searchKey(value), value);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/**
 * Writes out each field of an item for its details, read-only: what doesn't apply or wasn't filled in is said in
 * words, the position and side by their full names, and the unit price in reais.
 * @param item The item.
 * @returns The text of each field of the item form.
 */
export function itemDetailTexts(item: Item): Record<keyof ItemForm, string> {
  const notApplicable = "Não se aplica";
  return {
    code: item.code,
    name: item.name,
    category: item.category,
    partBrand: item.partBrand,
    vehicleBrand: item.vehicleBrand,
    vehicleModel: item.vehicleModel ?? "Qualquer modelo",
    quantity: String(item.quantity),
    minQuantity: String(item.minQuantity),
    position: item.position === NOT_APPLICABLE ? notApplicable : POSITION_NAMES[item.position],
    side: item.side === NOT_APPLICABLE ? notApplicable : SIDE_NAMES[item.side],
    color: item.color === NOT_APPLICABLE ? notApplicable : item.color,
    location: item.location ?? "Não informado",
    price: formatPrice(item.unitPriceCents),
  };
}

/**
 * Builds the body sent to the API: every text starts with a capital letter, the code is uppercase, a color that
 * already exists takes its spelling and an empty one is N/A, and blank quantities are zero.
 * @param form The form, already checked with itemFormErrors.
 * @param colors The colors already in stock.
 * @returns The create (or full edit) body.
 */
export function itemFormBody(form: ItemForm, colors: readonly string[]): ItemCreate {
  return {
    code: form.code.trim().toUpperCase(),
    name: capitalizeFirst(form.name),
    category: capitalizeFirst(form.category),
    partBrand: capitalizeFirst(form.partBrand),
    vehicleBrand: capitalizeFirst(form.vehicleBrand),
    vehicleModel: form.vehicleModel.trim() ? capitalizeFirst(form.vehicleModel) : "",
    quantity: Number(form.quantity || 0),
    minQuantity: Number(form.minQuantity || 0),
    position: form.position,
    side: form.side,
    color: form.color.trim() ? (findOption(colors, form.color) ?? capitalizeFirst(form.color)) : NOT_APPLICABLE,
    location: form.location.trim() ? capitalizeFirst(form.location) : "",
    unitPriceCents: parsePrice(form.price) ?? 0,
  };
}

/**
 * Checks the form before saving: the code, name, category, part brand, vehicle brand and unit price are required,
 * the price must be a number above zero, and the code can't be one another item uses (ignoring case).
 * @param form The form as typed.
 * @param items Every item in stock.
 * @param editingId The id of the item being edited, which may keep its own code.
 * @returns The message of each field that can't be saved, in form order; empty when the item can be saved.
 */
export function itemFormErrors(form: ItemForm, items: readonly Item[], editingId?: string): ItemFormErrors {
  const code = form.code.trim().toUpperCase();
  const owner = items.find((item) => item.id !== editingId && item.code.toUpperCase() === code);
  const price = parsePrice(form.price);
  return {
    ...(!code ? { code: ITEM_FORM_MESSAGES.code } : owner ? { code: codeTakenMessage(owner.name) } : {}),
    ...(!form.name.trim() && { name: ITEM_FORM_MESSAGES.name }),
    ...(!form.category.trim() && { category: ITEM_FORM_MESSAGES.category }),
    ...(!form.partBrand.trim() && { partBrand: ITEM_FORM_MESSAGES.partBrand }),
    ...(!form.vehicleBrand.trim() && { vehicleBrand: ITEM_FORM_MESSAGES.vehicleBrand }),
    ...(!form.price.trim() ? { price: ITEM_FORM_MESSAGES.price } : price === null || price <= 0 ? { price: ITEM_FORM_MESSAGES.priceInvalid } : {}),
  };
}

/**
 * Fills the form with an item to edit, the unit price written in the Brazilian format.
 * @param item The item.
 * @returns The form with its values.
 */
export function itemFormOf(item: Item): ItemForm {
  return {
    code: item.code,
    name: item.name,
    category: item.category,
    partBrand: item.partBrand,
    vehicleBrand: item.vehicleBrand,
    vehicleModel: item.vehicleModel ?? "",
    quantity: String(item.quantity),
    minQuantity: String(item.minQuantity),
    position: item.position,
    side: item.side,
    color: item.color === NOT_APPLICABLE ? "" : item.color,
    location: item.location ?? "",
    price: priceInput(item.unitPriceCents),
  };
}

/**
 * Lists the distinct values the items in stock have in some fields, for the item form's comboboxes and color.
 * @param items Every item in stock.
 * @returns Categories, part brands, vehicle brands and colors (without N/A), each sorted.
 */
export function itemFormOptions(items: readonly Item[]): ItemFormOptions {
  return {
    categories: distinct(items.map((item) => item.category)),
    partBrands: distinct(items.map((item) => item.partBrand)),
    vehicleBrands: distinct(items.map((item) => item.vehicleBrand)),
    colors: distinct(items.map((item) => item.color).filter((color) => color !== NOT_APPLICABLE)),
  };
}

/**
 * Lists the vehicle models the items in stock have for a vehicle brand, for the form's model combobox.
 * @param items Every item in stock.
 * @param vehicleBrand The chosen vehicle brand, matched ignoring case and accents.
 * @returns Its models, distinct and sorted; none while no brand is chosen.
 */
export function modelsOfBrand(items: readonly Item[], vehicleBrand: string): string[] {
  const brand = searchKey(vehicleBrand.trim());
  if (!brand) {
    return [];
  }
  return distinct(items.filter((item) => searchKey(item.vehicleBrand) === brand && item.vehicleModel).map((item) => item.vehicleModel!));
}

/**
 * Reads a unit price typed in the Brazilian format: a comma before the cents, dots between thousands, and an
 * optional "R$".
 * @param text The price as typed, e.g. "1.234,56", "89,9" or "R$ 12".
 * @returns The price in cents, or null when it isn't a price (e.g. "12.5", whose dot isn't between thousands).
 */
export function parsePrice(text: string): number | null {
  const typed = text.replace(/R\$/i, "").trim();
  if (!/^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/.test(typed)) {
    return null;
  }
  const clean = typed.replace(/\./g, "");
  const [reais, cents = ""] = clean.split(",");
  return Number(reais) * 100 + Number(cents.padEnd(2, "0"));
}

/**
 * Writes a price in cents for the price field: the Brazilian format without the currency sign.
 * @param cents Price in cents.
 * @returns E.g. "1.234,56".
 */
export function priceInput(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
