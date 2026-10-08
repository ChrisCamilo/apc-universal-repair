import type { FilterValues } from "../filters/filters.ts";
import { distinct } from "./itemForm.ts";
import { NOT_APPLICABLE, POSITION_NAMES, SIDE_NAMES, type Item, type ItemStatus } from "./items.ts";

// The inventory filters shared by web and mobile: the filters of the Filtros menu and the options each one offers,
// taken from the items in stock, and the list query that sends them, with the stock status, to the API. The
// vehicle model keeps its brand in the value, since two brands may share a model name; with vehicle brands chosen,
// it offers only their models.

/** Every filter of the Filtros menu, none chosen. */
export const EMPTY_ITEM_FILTERS: ItemFilters = {
  category: [],
  partBrand: [],
  vehicleBrand: [],
  vehicleModel: [],
  position: [],
  side: [],
  color: [],
  location: [],
};
/** The position chips: front, rear and not applicable; "Ambos" items match front and rear. */
export const POSITION_FILTERS = (["D", "T", NOT_APPLICABLE] as const).map((value) => ({
  value,
  label: value,
  title: POSITION_NAMES[value],
}));
/** The side chips: right, left and not applicable; "Ambos" items match either side. */
export const SIDE_FILTERS = (["LD", "LE", NOT_APPLICABLE] as const).map((value) => ({
  value,
  label: value,
  title: SIDE_NAMES[value],
}));
// Between the brand and the model in a vehicle model filter value; no brand or model name holds it.
const VEHICLE_MODEL_SEPARATOR = "|";

/** A chip of a chip group: its value, its label and the full name in its tooltip. */
type ChipOption = { value: string; label: string; title: string };
/** What each filter of the Filtros menu offers, from the items in stock. */
export type ItemFilterOptions = {
  categories: string[];
  partBrands: string[];
  vehicleBrands: string[];
  vehicleModels: { value: string; label: string }[];
  colors: string[];
  locations: string[];
};

/** A row of the Filtros menu: a multiple-choice list, or chip groups sharing the row. */
export type ItemFilterRow =
  | { key: keyof ItemFilters; label: string; allLabel: string; options: { value: string; label: string }[] }
  | { label: string; groups: { key: keyof ItemFilters; label: string; options: ChipOption[] }[] };
/** The values chosen in each filter of the Filtros menu. */
export type ItemFilters = Record<
  "category" | "partBrand" | "vehicleBrand" | "vehicleModel" | "position" | "side" | "color" | "location",
  string[]
>;
/**
 * Lists what each filter offers: the categories, brands and locations in stock, the colors in use with N/A first,
 * and the vehicle models as "Opala 4.1 · Chevrolet", only of the chosen vehicle brands when there are any.
 * @param items Every item in stock.
 * @param vehicleBrands Vehicle brands chosen in the menu.
 * @returns The options of each filter, each list in alphabetical order.
 */
export function itemFilterOptions(items: readonly Item[], vehicleBrands: readonly string[]): ItemFilterOptions {
  const colors = distinct(items.map((item) => item.color).filter((color) => color !== NOT_APPLICABLE));
  const models = items.filter(
    (item) => item.vehicleModel && (vehicleBrands.length === 0 || vehicleBrands.includes(item.vehicleBrand)),
  );
  return {
    categories: distinct(items.map((item) => item.category)),
    partBrands: distinct(items.map((item) => item.partBrand)),
    vehicleBrands: distinct(items.map((item) => item.vehicleBrand)),
    vehicleModels: distinct(models.map((item) => vehicleModelValue(item.vehicleBrand, item.vehicleModel!)))
      .map((value) => ({ value, label: vehicleModelLabel(value) }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
    colors: items.some((item) => item.color === NOT_APPLICABLE) ? [NOT_APPLICABLE, ...colors] : colors,
    locations: distinct(items.flatMap((item) => (item.location ? [item.location] : []))),
  };
}

/**
 * Lays out the Filtros menu for what is chosen in it so far: seven rows, position and side sharing one row of
 * chips, and the vehicle models narrowed to the chosen vehicle brands.
 * @param items Every item in stock.
 * @param draft Values chosen in the menu so far.
 * @returns The rows, in menu order.
 */
export function itemFilterRows(items: readonly Item[], draft: FilterValues): ItemFilterRow[] {
  const options = itemFilterOptions(items, draft.vehicleBrand ?? []);
  const plain = (values: string[]) => values.map((value) => ({ value, label: value }));
  return [
    { key: "category", label: "Categoria", allLabel: "Todas", options: plain(options.categories) },
    { key: "partBrand", label: "Marca da peça", allLabel: "Todas", options: plain(options.partBrands) },
    { key: "vehicleBrand", label: "Marca do veículo", allLabel: "Todas", options: plain(options.vehicleBrands) },
    { key: "vehicleModel", label: "Modelo do veículo", allLabel: "Todos", options: options.vehicleModels },
    {
      label: "Posição · Lado",
      groups: [
        { key: "position", label: "Posição", options: POSITION_FILTERS },
        { key: "side", label: "Lado", options: SIDE_FILTERS },
      ],
    },
    { key: "color", label: "Cor", allLabel: "Todas", options: plain(options.colors) },
    { key: "location", label: "Local", allLabel: "Todos", options: plain(options.locations) },
  ];
}

/**
 * Writes the list query of the chosen filters and stock status, each value of a filter as its own parameter, with
 * the search and the page when given.
 * @param filters Values chosen in the Filtros menu.
 * @param status Stock status chip on, or null.
 * @param list The search and the page to ask for, if any.
 * @returns E.g. "category=Freios&category=Motor&status=low&q=vela&page=2&pageSize=25"; empty when nothing is chosen.
 */
export function itemListQuery(
  filters: FilterValues,
  status: ItemStatus | null,
  list: { search?: string; page?: number; pageSize?: number } = {},
): string {
  const query = new URLSearchParams();
  for (const [key, values] of Object.entries(filters)) {
    for (const value of values) {
      query.append(key, value);
    }
  }
  if (status) {
    query.set("status", status);
  }
  if (list.search?.trim()) {
    query.set("q", list.search.trim());
  }
  if (list.pageSize) {
    query.set("page", String(list.page ?? 1));
    query.set("pageSize", String(list.pageSize));
  }
  return query.toString();
}

/**
 * Reads the brand and the model out of a vehicle model filter value.
 * @param value Value from vehicleModelValue.
 * @returns The brand and the model, or null when the value isn't one.
 */
export function splitVehicleModel(value: string): { vehicleBrand: string; vehicleModel: string } | null {
  const at = value.indexOf(VEHICLE_MODEL_SEPARATOR);
  return at > 0 ? { vehicleBrand: value.slice(0, at), vehicleModel: value.slice(at + 1) } : null;
}

/**
 * Words a vehicle model filter value the way the menu lists it, model first.
 * @param value Value from vehicleModelValue.
 * @returns E.g. "Opala 4.1 · Chevrolet".
 */
export function vehicleModelLabel(value: string): string {
  const pair = splitVehicleModel(value);
  return pair ? `${pair.vehicleModel} · ${pair.vehicleBrand}` : value;
}

/**
 * Keeps a vehicle model together with its brand in one filter value.
 * @param vehicleBrand The brand, e.g. "Chevrolet".
 * @param vehicleModel The model, e.g. "Opala 4.1".
 * @returns E.g. "Chevrolet|Opala 4.1".
 */
export function vehicleModelValue(vehicleBrand: string, vehicleModel: string): string {
  return `${vehicleBrand}${VEHICLE_MODEL_SEPARATOR}${vehicleModel}`;
}
