import { z } from "zod";

// Inventory items as the API sends and receives them, and the rules web, mobile and the API apply alike:
// how text is written (first letter capital, codes uppercase), how a search matches names and part codes,
// and how "Ambos" fits both front and rear (or both sides) in the filters.

/** The status filter values: low stock (at or under the minimum, not zero) and out of stock (zero). */
export const ITEM_STATUSES = ["low", "out"] as const;
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
export const itemCreateSchema = z.object({
  code: requiredText,
  name: requiredText,
  category: requiredText,
  partBrand: requiredText,
  vehicleBrand: requiredText,
  vehicleModel: optionalText,
  position: z.enum(POSITIONS).optional(),
  side: z.enum(SIDES).optional(),
  color: optionalText,
  location: optionalText,
  quantity: z.int().min(0).optional(),
  minQuantity: z.int().min(0).optional(),
  unitPriceCents: z.int().positive("Must be greater than zero."),
});
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
});
export const itemSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  category: z.string(),
  partBrand: z.string(),
  vehicleBrand: z.string(),
  vehicleModel: z.string().nullable(),
  position: z.enum(POSITIONS),
  side: z.enum(SIDES),
  color: z.string(),
  location: z.string().nullable(),
  quantity: z.int().min(0),
  minQuantity: z.int().min(0),
  unitPriceCents: z.int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const itemListResponseSchema = z.object({ items: z.array(itemSchema) });
export const itemUpdateSchema = itemCreateSchema.partial();
/** The "doesn't apply" value of position, side and color, the default when nothing is chosen. */
export const NOT_APPLICABLE = "N/A";

export type Item = z.infer<typeof itemSchema>;
export type ItemCreate = z.infer<typeof itemCreateSchema>;
export type ItemListQuery = z.infer<typeof itemListQuerySchema>;
export type ItemStatus = (typeof ITEM_STATUSES)[number];
export type ItemUpdate = z.infer<typeof itemUpdateSchema>;

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
  const key = searchKey(text.trim().replace(/\s+/g, " "));
  return key ? options.find((option) => searchKey(option) === key) : undefined;
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
 * Writes an item's details in one line, for the phone card under the name, leaving out what doesn't apply.
 * @param item Inventory item.
 * @returns E.g. "Freios · Cobreq · Volkswagen Gol · D · A-2 · R$ 89,90".
 */
export function itemDetails(item: Omit<Item, "id" | "code" | "name" | "quantity" | "minQuantity" | "createdAt" | "updatedAt">): string {
  return [
    item.category,
    item.partBrand,
    [item.vehicleBrand, item.vehicleModel].filter(Boolean).join(" "),
    item.position,
    item.side,
    item.color,
    item.location,
    formatPrice(item.unitPriceCents),
  ]
    .filter((value) => value && value !== NOT_APPLICABLE)
    .join(" · ");
}

/**
 * Tells whether an item matches a search, the same way the API's `q` does: its name ignoring case and
 * accents, or its part code ignoring spaces and separators.
 * @param item The item's name and part code.
 * @param search The search as typed; an empty search matches every item.
 * @returns True when the item matches.
 */
export function matchesSearch(item: Pick<Item, "name" | "code">, search: string): boolean {
  const byCode = codeKey(search);
  return searchKey(item.name).includes(searchKey(search.trim())) || (byCode !== "" && codeKey(item.code).includes(byCode));
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
