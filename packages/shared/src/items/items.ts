import { z } from "zod";
import { PAGE_SIZES } from "../pagination/pagination.ts";
import { ITEM_PHOTO_LIMIT } from "../photos/photos.ts";
import { sortRows, type Sort } from "../table/table.ts";

// Inventory items as the API sends and receives them, and the rules web, mobile and the API apply alike:
// how text is written (first letter capital, codes uppercase), how a search matches names and part codes,
// how "Ambos" fits both front and rear (or both sides) in the filters, and how the list sorts by a column. An item is
// a part made by one brand or more, which replace each other: the item holds what they share (name, category,
// vehicle, position, side, the minimum stock and the vehicle maker's original codes) and each brand its own part code,
// color, location, quantity, price and photos. Every code, original or a brand's, finds the item in the search and is
// used once in the stock. The item's quantity is its brands' sum, against its minimum; a column of the list reads the brands as
// one value: the first brand's (the cover's), every brand's when they agree, or the lowest price.

/** The columns the inventory list sorts by, as the list query's `sort` names them. */
export const ITEM_SORT_KEYS = ["name", "category", "partBrand", "vehicle", "position", "side", "color", "location", "price", "quantity"] as const;
/** The value each column sorts by: the vehicle by its brand (then its model), the price in cents. */
const ITEM_SORT_VALUES: Record<ItemSortKey, (item: SortableItem) => string | number> = {
  name: (item) => item.name,
  category: (item) => item.category,
  partBrand: (item) => item.partBrand,
  vehicle: (item) => item.vehicleBrand,
  position: (item) => item.position,
  side: (item) => item.side,
  color: (item) => item.color,
  location: (item) => item.location ?? "",
  price: (item) => item.unitPriceCents,
  quantity: (item) => item.quantity,
};
/** The status filter values: low stock (at or under the minimum, not zero) and out of stock (zero). */
export const ITEM_STATUSES = ["low", "out"] as const;
/** The most a unit price can be, in cents: R$ 1.000.000,00. */
export const MAX_PRICE_CENTS = 100_000_000;
/** The most an item's quantity, or its minimum, can be: far above any stock, and well within the database's column. */
export const MAX_QUANTITY = 1_000_000;
/** What a column of the list shows for the brands of an item when they differ, e.g. in color. */
export const MIXED_VALUES = "Várias";
/**
 * localStorage (web) and AsyncStorage (mobile) key of the "Abrir item ao clicar na linha" choice; on when not saved.
 */
export const OPEN_ITEM_ON_ROW_STORAGE_KEY = "apc-open-item-on-row";
const optionalText = z.string().trim().optional();
/** Full names of the positions, for tooltips and screen readers. */
export const POSITION_NAMES: Record<(typeof POSITIONS)[number], string> = {
  "N/A": "Posição não se aplica",
  D: "Dianteiro",
  T: "Traseiro",
  Ambos: "Dianteiro e traseiro",
};
/** Positions an item fits: not applicable, front, rear, or both. */
export const POSITIONS = ["N/A", "D", "T", "Ambos"] as const;
const requiredText = z.string().trim().min(1, "Required.");
/** Full names of the sides, for tooltips and screen readers. */
export const SIDE_NAMES: Record<(typeof SIDES)[number], string> = {
  "N/A": "Lado não se aplica",
  LD: "Lado direito",
  LE: "Lado esquerdo",
  Ambos: "Os dois lados",
};
/** Sides an item fits: not applicable, right, left, or both. */
export const SIDES = ["N/A", "LD", "LE", "Ambos"] as const;
/** What each stock status is called on screen and read out. */
export const STOCK_STATUS_LABELS: Record<(typeof ITEM_STATUSES)[number], string> = { low: "Estoque baixo", out: "Esgotado" };
/** A brand of an item as it is sent: on an edit, with the id of the brand it keeps; without one, a new brand. */
export const itemBrandCreateSchema = z.object({
  id: z.uuid().optional(),
  partBrand: requiredText,
  code: requiredText,
  color: optionalText,
  location: optionalText,
  quantity: z.int().min(0).max(MAX_QUANTITY).optional(),
  unitPriceCents: z.int().positive("Must be greater than zero.").max(MAX_PRICE_CENTS),
});
// An item's brands: at least one, each part brand and each part code once, as the search compares codes.
const brandsSchema = z
  .array(itemBrandCreateSchema)
  .min(1, "An item has at least one brand.")
  .superRefine((brands, context) => {
    for (const [field, key] of [
      ["partBrand", optionKey],
      ["code", codeKey],
    ] as const) {
      const seen = new Set<string>();
      brands.forEach((brand, index) => {
        if (seen.has(key(brand[field]))) {
          context.addIssue({ code: "custom", path: [index, field], message: `Repeated in the item's brands.` });
        }
        seen.add(key(brand[field]));
      });
    }
  });
// An item's original codes: each once, as the search compares codes.
const originalCodesSchema = z.array(requiredText).superRefine((codes, context) => {
  const seen = new Set<string>();
  codes.forEach((code, index) => {
    if (seen.has(codeKey(code))) {
      context.addIssue({ code: "custom", path: [index], message: "Repeated in the item's original codes." });
    }
    seen.add(codeKey(code));
  });
});
// The fields of an item as it is sent, before the check that its original codes aren't its brands' codes too.
const itemFieldsSchema = z.object({
  name: requiredText,
  category: requiredText,
  vehicleBrand: requiredText,
  vehicleModel: optionalText,
  position: z.enum(POSITIONS).optional(),
  side: z.enum(SIDES).optional(),
  minQuantity: z.int().min(0).max(MAX_QUANTITY).optional(),
  /** The vehicle maker's original codes (OEM), in order; none when left out. */
  originalCodes: originalCodesSchema.optional(),
  brands: brandsSchema,
});
/**
 * Refuses an original code that is also a code of one of the item's brands, when both are sent.
 * @param item The item as sent.
 * @param context Where the issue goes, on the original code.
 */
function checkCodesApart(item: { originalCodes?: string[]; brands?: { code: string }[] }, context: z.RefinementCtx): void {
  const brandCodes = new Set((item.brands ?? []).map((brand) => codeKey(brand.code)));
  item.originalCodes?.forEach((code, index) => {
    if (brandCodes.has(codeKey(code))) {
      context.addIssue({ code: "custom", path: ["originalCodes", index], message: "Also a code of one of the item's brands." });
    }
  });
}
export const itemCreateSchema = itemFieldsSchema.superRefine(checkCodesApart);
export const itemIdParamsSchema = z.object({ id: z.uuid() });
// A filter given once arrives as a string and given several times as an array; both become a list.
const manyValues = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => (value === undefined ? [] : [value].flat()));
export const itemListQuerySchema = z.object({
  q: z.string().trim().optional(),
  category: manyValues,
  partBrand: manyValues,
  vehicleBrand: manyValues,
  vehicleModel: manyValues,
  position: manyValues,
  side: manyValues,
  color: manyValues,
  location: manyValues,
  status: z.enum(ITEM_STATUSES).optional(),
  /** Page to send, from 1; only with pageSize. */
  page: z.coerce.number().int().min(1).optional(),
  /** Items per page, one of PAGE_SIZES; without it every matching item is sent. */
  pageSize: z.coerce
    .number()
    .refine((size) => (PAGE_SIZES as readonly number[]).includes(size), `Must be one of ${PAGE_SIZES.join(", ")}.`)
    .optional(),
  /** Column to sort by; without it the newest items come first. */
  sort: z.enum(ITEM_SORT_KEYS).optional(),
  /** Direction of the sort, ascending by default. */
  order: z.enum(["asc", "desc"]).optional(),
});
/**
 * A saved photo of an item: its id, and where the API serves the original and the thumbnail, as paths on the API
 * (e.g. "/photos/<id>.jpg"), which the web reaches under /api and the phone under API_URL.
 */
export const itemPhotoSchema = z.object({ id: z.uuid(), url: z.string(), thumbUrl: z.string() });
/** A brand that makes an item's part, with what is its own. */
export const itemBrandSchema = z.object({
  id: z.uuid(),
  partBrand: z.string(),
  code: z.string(),
  color: z.string(),
  location: z.string().nullable(),
  quantity: z.int().min(0),
  unitPriceCents: z.int().positive(),
  /** Photos in order, the first one the cover. */
  photos: z.array(itemPhotoSchema).max(ITEM_PHOTO_LIMIT),
});
export const itemBrandIdParamsSchema = z.object({ id: z.uuid(), brandId: z.uuid() });
export const itemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  category: z.string(),
  vehicleBrand: z.string(),
  vehicleModel: z.string().nullable(),
  position: z.enum(POSITIONS),
  side: z.enum(SIDES),
  /** The brands' quantities added up. */
  quantity: z.int().min(0),
  minQuantity: z.int().min(0),
  /** The vehicle maker's original codes (OEM), in order, the same for every brand. */
  originalCodes: z.array(z.string()),
  /** The brands in the order they were added, the first one the item's cover. */
  brands: z.array(itemBrandSchema).min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
/** A list of items, newest first: one page of them when a page size was asked, and how many match in all. */
export const itemListResponseSchema = z.object({ items: z.array(itemSchema), total: z.int().min(0) });
/**
 * An edit: the fields sent change; brands, when sent, is the whole new set (see itemBrandCreateSchema), and so are the
 * original codes.
 */
export const itemUpdateSchema = itemFieldsSchema.partial().superRefine(checkCodesApart);
/** The "doesn't apply" value of position, side and color, the default when nothing is chosen. */
export const NOT_APPLICABLE = "N/A";

export type Item = z.infer<typeof itemSchema>;
export type ItemBrand = z.infer<typeof itemBrandSchema>;
export type ItemBrandCreate = z.infer<typeof itemBrandCreateSchema>;
export type ItemCreate = z.infer<typeof itemCreateSchema>;
export type ItemListQuery = z.infer<typeof itemListQuerySchema>;
export type ItemPhoto = z.infer<typeof itemPhotoSchema>;
/** A column the inventory list sorts by. */
export type ItemSortKey = (typeof ITEM_SORT_KEYS)[number];
export type ItemStatus = (typeof ITEM_STATUSES)[number];
export type ItemUpdate = z.infer<typeof itemUpdateSchema>;
/**
 * What sorting an item looks at (see sortableOf): its brands read as one value each, the first brand's code, part
 * brand, color and location and the lowest price; position and side as any text, as the database keeps them.
 */
export type SortableItem = Pick<Item, "name" | "category" | "vehicleBrand" | "vehicleModel" | "quantity"> &
  Pick<ItemBrand, "code" | "partBrand" | "color" | "location" | "unitPriceCents"> & { position: string; side: string };

/**
 * Lists every code of an item, as the search and the stock's uniqueness see them: its brands' codes, in their order,
 * then its original codes.
 * @param item The item.
 * @returns E.g. ["N-1210", "PD/1210", "5U0 698 151"].
 */
export function allCodes(item: { originalCodes: readonly string[]; brands: readonly Pick<ItemBrand, "code">[] }): string[] {
  return [...item.brands.map((brand) => brand.code), ...item.originalCodes];
}

/**
 * Reads a field of an item's brands as one value, for a column of the list: the value every brand has, or "Várias"
 * when they differ.
 * @param item The item.
 * @param field The brands' field, e.g. "color".
 * @returns E.g. "Preto", or null for a location none of them has.
 */
export function brandsValue(item: { brands: readonly Pick<ItemBrand, "color" | "location">[] }, field: "color" | "location"): string | null {
  const values = new Set(item.brands.map((brand) => brand[field]));
  return values.size === 1 ? [...values][0] : MIXED_VALUES;
}

/**
 * Applies the writing rule to a text value: trimmed, first letter capital, the rest as typed, so acronyms
 * like NGK or XR3 stay intact ("l" becomes "L", "bomba d'água" becomes "Bomba d'água").
 * @param text Text as typed.
 * @returns The text as it is saved.
 */
export function capitalizeFirst(text: string): string {
  const trimmed = text.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Reduces a part code to what a search compares: letters and digits only, uppercase, so "w712" finds
 * "W 712/95".
 * @param code A part code or a search.
 * @returns The code without spaces or separators such as - / .
 */
export function codeKey(code: string): string {
  return code.toUpperCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Finds the option a typed text stands for, ignoring case, accents and extra spaces, so "freios" is saved as
 * "Freios" and the filter lists don't split.
 * @param options The existing options, e.g. the categories.
 * @param text Text as typed.
 * @returns The option's own spelling, or undefined when no option matches.
 */
export function findOption(options: readonly string[], text: string): string | undefined {
  const key = optionKey(text);
  return key ? options.find((option) => optionKey(option) === key) : undefined;
}

/**
 * Writes a price in cents as Brazilian reais.
 * @param cents Price in cents.
 * @returns E.g. "R$ 1.234,56".
 */
export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Writes an item's unit price: its one price, or the range from its lowest to its highest brand's.
 * @param item The item.
 * @returns E.g. "R$ 89,90", or "R$ 80,00 – R$ 120,00".
 */
export function formatPriceRange(item: { brands: readonly Pick<ItemBrand, "unitPriceCents">[] }): string {
  const { lowest, highest } = priceRange(item);
  return lowest === highest ? formatPrice(lowest) : `${formatPrice(lowest)} – ${formatPrice(highest)}`;
}

/**
 * Widens a position or side filter so items marked "Ambos" also match a specific front/rear or side,
 * since they fit both; picking only "Ambos" or "N/A" keeps the exact values.
 * @param values Chosen filter values, e.g. ["D"].
 * @param specific The values "Ambos" covers: ["D", "T"] for position, ["LD", "LE"] for side.
 * @returns The values to match, e.g. ["D", "Ambos"].
 */
export function includeBoth(values: readonly string[], specific: readonly string[]): string[] {
  const widened = values.some((value) => specific.includes(value)) && !values.includes("Ambos");
  return widened ? [...values, "Ambos"] : [...values];
}

/**
 * Writes an item's part codes for its row: the first brand's, and how many more the other brands have.
 * @param item The item.
 * @returns E.g. "W 712/95", or "W 712/95 +2".
 */
export function itemCodes(item: { brands: readonly Pick<ItemBrand, "code">[] }): string {
  const [first, ...others] = item.brands;
  return others.length > 0 ? `${first.code} +${others.length}` : first.code;
}

/**
 * Writes an item's details in one line, for the phone card under the name, leaving out what doesn't apply.
 * @param item Inventory item.
 * @returns E.g. "Freios · Cobreq · Volkswagen Gol · D · A-2 · R$ 89,90".
 */
export function itemDetails(
  item: Pick<Item, "category" | "vehicleBrand" | "vehicleModel" | "position" | "side"> & {
    brands: readonly Pick<ItemBrand, "partBrand" | "color" | "location" | "unitPriceCents">[];
  },
): string {
  return [
    item.category,
    partBrandsLabel(item),
    [item.vehicleBrand, item.vehicleModel].filter(Boolean).join(" "),
    item.position,
    item.side,
    brandsValue(item, "color"),
    brandsValue(item, "location"),
    formatPriceRange(item),
  ]
    .filter((value) => value && value !== NOT_APPLICABLE)
    .join(" · ");
}

/**
 * Tells whether an item matches a search, the same way the API's `q` does: its name ignoring case and
 * accents, or any of its codes, its brands' or its original ones, ignoring spaces and separators.
 * @param item The item's name, its original codes and its brands' part codes.
 * @param search The search as typed; an empty search matches every item.
 * @returns True when the item matches.
 */
export function matchesSearch(
  item: Pick<Item, "name" | "originalCodes"> & { brands: readonly Pick<ItemBrand, "code">[] },
  search: string,
): boolean {
  const byCode = codeKey(search);
  return (
    searchKey(item.name).includes(searchKey(search.trim())) ||
    (byCode !== "" && allCodes(item).some((code) => codeKey(code).includes(byCode)))
  );
}

/**
 * Lists the options a Combobox shows for a typed text: every option while the text is empty or names one of
 * them, otherwise the options that contain it, ignoring case and accents.
 * @param options The existing options.
 * @param text Text as typed.
 * @returns The options to list, in their order.
 */
export function matchingOptions(options: readonly string[], text: string): string[] {
  if (findOption(options, text) !== undefined) {
    return [...options];
  }
  const key = searchKey(text.trim());
  return options.filter((option) => searchKey(option).includes(key));
}

/**
 * Reduces an option's name to what tells options apart: lowercase without accents or extra spaces, so "Freios",
 * " freios " and "FREIOS" are the same category.
 * @param text A name as typed or saved.
 * @returns The name's key, e.g. "bomba d'agua".
 */
export function optionKey(text: string): string {
  return searchKey(text.trim().replace(/\s+/g, " "));
}

/**
 * Writes an item's part brands for its row: the first brand, and how many more make the part.
 * @param item The item.
 * @returns E.g. "Cobreq", or "Cobreq +2".
 */
export function partBrandsLabel(item: { brands: readonly Pick<ItemBrand, "partBrand">[] }): string {
  const [first, ...others] = item.brands;
  return others.length > 0 ? `${first.partBrand} +${others.length}` : first.partBrand;
}

/**
 * Finds an item's lowest and highest unit price among its brands.
 * @param item The item.
 * @returns Both prices in cents, the same for an item with one brand.
 */
export function priceRange(item: { brands: readonly Pick<ItemBrand, "unitPriceCents">[] }): { lowest: number; highest: number } {
  const prices = item.brands.map((brand) => brand.unitPriceCents);
  return { lowest: Math.min(...prices), highest: Math.max(...prices) };
}

/**
 * Writes the result counter of the inventory: how many items show of the total, and how many of all items
 * are low and out of stock.
 * @param shown How many items the search and filters leave.
 * @param items Every item in stock.
 * @returns E.g. "3 de 12 itens · 2 baixos · 1 esgotado".
 */
export function resultSummary(shown: number, items: readonly Pick<Item, "quantity" | "minQuantity">[]): string {
  const low = items.filter((item) => stockStatus(item.quantity, item.minQuantity) === "low").length;
  const out = items.filter((item) => stockStatus(item.quantity, item.minQuantity) === "out").length;
  const total = `${items.length} ${items.length === 1 ? "item" : "itens"}`;
  return `${shown} de ${total} · ${low} ${low === 1 ? "baixo" : "baixos"} · ${out} ${out === 1 ? "esgotado" : "esgotados"}`;
}

/**
 * Reduces a name to what a search compares: lowercase without accents, so "agua" finds "Bomba d'água".
 * @param text A name or a search.
 * @returns The text in lowercase, accents removed.
 */
export function searchKey(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Reads what an item sorts by: its first brand's code, part brand, color and location, and its lowest price.
 * @param item The item.
 * @returns What sortItems looks at.
 */
export function sortableOf(item: Item): SortableItem {
  const [first] = item.brands;
  return {
    name: item.name,
    category: item.category,
    vehicleBrand: item.vehicleBrand,
    vehicleModel: item.vehicleModel,
    position: item.position,
    side: item.side,
    quantity: item.quantity,
    code: first.code,
    partBrand: first.partBrand,
    color: first.color,
    location: first.location,
    unitPriceCents: priceRange(item).lowest,
  };
}

/**
 * Sorts items by a column of the inventory list: text in pt-BR order ignoring case and accents, with numbers in
 * place ("A-2" before "A-10"), the price and quantity by value, and the vehicle by brand, then model. Ties keep the
 * part code order, so the result is the same on every request.
 * @param items Items in any order.
 * @param sort The column and the direction.
 * @returns A new array in the sorted order.
 */
export function sortItems<Sortable extends SortableItem>(items: readonly Sortable[], sort: Sort & { key: ItemSortKey }): Sortable[] {
  const byCode = sortRows(items, (item) => item.code, "asc");
  const byModel = sort.key === "vehicle" ? sortRows(byCode, (item) => item.vehicleModel ?? "", sort.dir) : byCode;
  return sortRows(byModel, ITEM_SORT_VALUES[sort.key], sort.dir);
}

/**
 * Tells an item's stock status from its quantity and minimum.
 * @param quantity Units in stock.
 * @param minQuantity Units at or under which stock is low.
 * @returns "out" at zero, "low" at or under the minimum, or null when stock is fine.
 */
export function stockStatus(quantity: number, minQuantity: number): ItemStatus | null {
  if (quantity === 0) {
    return "out";
  }
  return quantity <= minQuantity ? "low" : null;
}
