import { z } from "zod";
import { apiFetch } from "../auth/apiFetch.ts";
import { CATALOG } from "../catalog/catalog.ts";
import { capitalizeFirst, optionKey, type Item } from "../items/items.ts";

// The lists an item's category, part brand, vehicle brand and vehicle model are picked from, kept by the API, grown
// from the item form and tidied in the "Gerenciar listas" dialog: each name is unique ignoring case, accents and
// extra spaces (a vehicle model within its vehicle brand), so creating a name that already exists gives back the
// existing one, and a rename can't take another entry's name: it merges the entry into the one that has it instead,
// moving its items there. Renaming renames the items that use the entry; an entry is only deleted while no item uses
// it, a vehicle brand with its models, and never a brand the catalog has, which can't be merged away either. Web and
// mobile load, create, rename, merge and delete the same way, each through its own API address.

/** Why a vehicle brand of the catalog can't be deleted from the inventory. */
export const CATALOG_BRAND_MESSAGE = (name: string) => `“${name}” também está no catálogo e não pode ser excluída do estoque.`;
/** Why a vehicle brand of the catalog can't be merged into another one. */
export const CATALOG_MERGE_MESSAGE = (name: string) => `“${name}” também está no catálogo e não pode ser juntada a outra marca.`;
/** The four lists before they load: all empty. */
export const EMPTY_ITEM_LISTS: ItemLists = { categories: [], partBrands: [], vehicleBrands: [], vehicleModels: [] };
/** The item field each list holds the names of: a part brand is a field of each of the item's brands. */
export const ITEM_LIST_FIELDS = {
  categories: "category",
  partBrands: "partBrand",
  vehicleBrands: "vehicleBrand",
  vehicleModels: "vehicleModel",
} as const satisfies Record<ItemListKind, "category" | "partBrand" | "vehicleBrand" | "vehicleModel">;
/** The API path of each list. */
export const ITEM_LIST_PATHS: Record<ItemListKind, string> = {
  categories: "/categories",
  partBrands: "/part-brands",
  vehicleBrands: "/vehicle-brands",
  vehicleModels: "/vehicle-models",
};
/** What the screens say about each list: its title, and the toasts and messages of each change made to it. */
export const ITEM_LIST_TEXTS: Record<ItemListKind, ItemListTexts> = {
  categories: {
    title: "Categorias",
    created: (name) => `Categoria “${name}” criada.`,
    createFailed: "Não foi possível criar a categoria. Tente de novo.",
    renamed: (name) => `Categoria renomeada para “${name}”.`,
    renameFailed: "Não foi possível renomear a categoria. Tente de novo.",
    taken: "Já existe uma categoria com esse nome.",
    deleted: (name) => `Categoria “${name}” excluída.`,
    deleteFailed: "Não foi possível excluir a categoria. Tente de novo.",
    confirmDelete: (name) => `“${name}” sai da lista de categorias. Essa ação não pode ser desfeita.`,
    inUse: (name, count) => `${itemCount(count)} ${count === 1 ? "usa" : "usam"} “${name}”. Troque a categoria desses itens antes de excluir.`,
    confirmMerge: (from, into, count) =>
      `${movedItems(from, into, count)}, e “${from}” sai da lista de categorias.`,
    merged: (from, into, count) =>
      `Categoria “${from}” juntada a “${into}”: ${itemCount(count)} ${count === 1 ? "mudou" : "mudaram"}.`,
    mergeFailed: "Não foi possível juntar a categoria. Tente de novo.",
  },
  partBrands: {
    title: "Marcas de peça",
    created: (name) => `Marca de peça “${name}” criada.`,
    createFailed: "Não foi possível criar a marca de peça. Tente de novo.",
    renamed: (name) => `Marca de peça renomeada para “${name}”.`,
    renameFailed: "Não foi possível renomear a marca de peça. Tente de novo.",
    taken: "Já existe uma marca de peça com esse nome.",
    deleted: (name) => `Marca de peça “${name}” excluída.`,
    deleteFailed: "Não foi possível excluir a marca de peça. Tente de novo.",
    confirmDelete: (name) => `“${name}” sai da lista de marcas de peça. Essa ação não pode ser desfeita.`,
    inUse: (name, count) => `${itemCount(count)} ${count === 1 ? "usa" : "usam"} “${name}”. Troque a marca da peça desses itens antes de excluir.`,
    confirmMerge: (from, into, count) =>
      `${movedItems(from, into, count)}, e “${from}” sai da lista de marcas de peça.`,
    merged: (from, into, count) =>
      `Marca de peça “${from}” juntada a “${into}”: ${itemCount(count)} ${count === 1 ? "mudou" : "mudaram"}.`,
    mergeFailed: "Não foi possível juntar a marca de peça. Tente de novo.",
  },
  vehicleBrands: {
    title: "Marcas de veículo",
    created: (name) => `Marca de veículo “${name}” criada.`,
    createFailed: "Não foi possível criar a marca de veículo. Tente de novo.",
    renamed: (name) => `Marca de veículo renomeada para “${name}”.`,
    renameFailed: "Não foi possível renomear a marca de veículo. Tente de novo.",
    taken: "Já existe uma marca de veículo com esse nome.",
    deleted: (name) => `Marca de veículo “${name}” excluída.`,
    deleteFailed: "Não foi possível excluir a marca de veículo. Tente de novo.",
    confirmDelete: (name) => `“${name}” e os modelos dela saem da lista de marcas de veículo. Essa ação não pode ser desfeita.`,
    inUse: (name, count) => `${itemCount(count)} ${count === 1 ? "usa" : "usam"} “${name}”. Troque a marca do veículo desses itens antes de excluir.`,
    confirmMerge: (from, into, count) =>
      `${movedItems(from, into, count)}, os modelos dela também (os de mesmo nome viram um só), e “${from}” sai da lista de marcas de veículo.`,
    merged: (from, into, count) =>
      `Marca de veículo “${from}” juntada a “${into}”: ${itemCount(count)} ${count === 1 ? "mudou" : "mudaram"}.`,
    mergeFailed: "Não foi possível juntar a marca de veículo. Tente de novo.",
  },
  vehicleModels: {
    title: "Modelos de veículo",
    created: (name) => `Modelo “${name}” criado.`,
    createFailed: "Não foi possível criar o modelo. Tente de novo.",
    renamed: (name) => `Modelo renomeado para “${name}”.`,
    renameFailed: "Não foi possível renomear o modelo. Tente de novo.",
    taken: "Já existe um modelo com esse nome nessa marca.",
    deleted: (name) => `Modelo “${name}” excluído.`,
    deleteFailed: "Não foi possível excluir o modelo. Tente de novo.",
    confirmDelete: (name) => `“${name}” sai da lista de modelos. Essa ação não pode ser desfeita.`,
    inUse: (name, count) => `${itemCount(count)} ${count === 1 ? "usa" : "usam"} “${name}”. Troque o modelo do veículo desses itens antes de excluir.`,
    confirmMerge: (from, into, count) =>
      `${movedItems(from, into, count)}, e “${from}” sai da lista de modelos.`,
    merged: (from, into, count) =>
      `Modelo “${from}” juntado a “${into}”: ${itemCount(count)} ${count === 1 ? "mudou" : "mudaram"}.`,
    mergeFailed: "Não foi possível juntar o modelo. Tente de novo.",
  },
};
export const listEntrySchema = z.object({ id: z.uuid(), name: z.string() });
export const listEntriesSchema = z.array(listEntrySchema);
export const listEntryCreateSchema = z.object({ name: z.string().trim().min(1, "Required.") });
export const listEntryIdParamsSchema = z.object({ id: z.uuid() });
/** Merging an entry into another of its list. */
export const listEntryMergeSchema = z.object({ into: z.uuid() });
/** What a merge answers: how many items moved to the entry merged into. */
export const listEntryMergedSchema = z.object({ moved: z.int().min(0) });
/** A vehicle model, which always belongs to a vehicle brand. */
export const vehicleModelSchema = listEntrySchema.extend({ vehicleBrandId: z.uuid() });
export const vehicleModelCreateSchema = listEntryCreateSchema.extend({ vehicleBrandId: z.uuid() });
export const vehicleModelsSchema = z.array(vehicleModelSchema);

/** One of the four lists. */
export type ItemListKind = "categories" | "partBrands" | "vehicleBrands" | "vehicleModels";
/** What the screens say about one list. */
export type ItemListTexts = {
  title: string;
  created: (name: string) => string;
  createFailed: string;
  renamed: (name: string) => string;
  renameFailed: string;
  /** A rename to the name of another entry. */
  taken: string;
  deleted: (name: string) => string;
  deleteFailed: string;
  confirmDelete: (name: string) => string;
  /** Why an entry items use can't be deleted. */
  inUse: (name: string, count: number) => string;
  /** What merging an entry into another does, asked before it is done. */
  confirmMerge: (from: string, into: string, count: number) => string;
  merged: (from: string, into: string, count: number) => string;
  mergeFailed: string;
};
/**
 * A rename, or a merge, of an entry, which the filters follow: its list, its name before and after, and a vehicle
 * model's brand.
 */
export type ListEntryChange = { kind: ItemListKind; from: string; to: string; vehicleBrand?: string };
/** The four lists, each sorted by name. */
export type ItemLists = {
  categories: ListEntry[];
  partBrands: ListEntry[];
  vehicleBrands: ListEntry[];
  vehicleModels: VehicleModel[];
};
export type ListEntry = z.infer<typeof listEntrySchema>;
export type VehicleModel = z.infer<typeof vehicleModelSchema>;

/**
 * Creates a name in a list, or finds it there when it already exists.
 * @param base Where the API is reached, e.g. "/api" on the web.
 * @param kind The list.
 * @param name The name as typed.
 * @param vehicleBrandId The vehicle brand a new vehicle model belongs to.
 * @returns The name as the list holds it, or null when it couldn't be created.
 */
export async function createListEntry(
  base: string,
  kind: ItemListKind,
  name: string,
  vehicleBrandId?: string,
): Promise<ListEntry | VehicleModel | null> {
  const response = await apiFetch(`${base}${ITEM_LIST_PATHS[kind]}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(kind === "vehicleModels" ? { name, vehicleBrandId } : { name }),
  }).catch(() => null);
  if (!response?.ok) {
    return null;
  }
  const body = await response.json();
  return kind === "vehicleModels" ? vehicleModelSchema.parse(body) : listEntrySchema.parse(body);
}

/**
 * Deletes an entry from a list; a vehicle brand goes with its models.
 * @param base Where the API is reached, e.g. "/api" on the web.
 * @param kind The list.
 * @param id The entry's id.
 * @returns Whether it was deleted.
 */
export async function deleteListEntry(base: string, kind: ItemListKind, id: string): Promise<boolean> {
  const response = await apiFetch(`${base}${ITEM_LIST_PATHS[kind]}/${id}`, { method: "DELETE" }).catch(() => null);
  return response?.ok ?? false;
}

/**
 * Describes an entry renamed, or merged into another, for the filters to follow (see followEntryChange).
 * @param kind The entry's list.
 * @param entry The entry as it was.
 * @param to Its new name, or the name of the entry it was merged into.
 * @param lists The four lists, for a vehicle model's brand.
 * @returns The change.
 */
export function entryChange(kind: ItemListKind, entry: ListEntry | VehicleModel, to: string, lists: ItemLists): ListEntryChange {
  const brand = "vehicleBrandId" in entry ? lists.vehicleBrands.find((held) => held.id === entry.vehicleBrandId) : undefined;
  return { kind, from: entry.name, to, ...(brand && { vehicleBrand: brand.name }) };
}

/**
 * Finds the entry a typed name stands for, ignoring case, accents and extra spaces.
 * @param entries A list.
 * @param text Name as typed.
 * @returns The entry, or undefined when the list doesn't hold the name.
 */
export function findEntry<Entry extends ListEntry>(entries: readonly Entry[], text: string): Entry | undefined {
  const key = optionKey(text);
  return key ? entries.find((entry) => optionKey(entry.name) === key) : undefined;
}

/**
 * Tells whether a vehicle brand is one the catalog has, which the inventory can't delete.
 * @param name The brand's name.
 * @returns True for a catalog brand, ignoring case, accents and extra spaces.
 */
export function isCatalogBrand(name: string): boolean {
  return CATALOG.some((brand) => optionKey(brand.name) === optionKey(name));
}

/**
 * Words a number of items.
 * @param count How many items.
 * @returns E.g. "1 item", "3 itens".
 */
function itemCount(count: number): string {
  return `${count} ${count === 1 ? "item" : "itens"}`;
}

/**
 * Counts the items that use an entry, ignoring case, accents and extra spaces: by name, a part brand by any of the
 * item's brands, a vehicle brand by any of its vehicles, and a vehicle model by a vehicle of its brand and name.
 * @param items Every item in stock.
 * @param kind The entry's list.
 * @param entry The entry.
 * @param lists The four lists, for a vehicle model's brand.
 * @returns How many items use it.
 */
export function itemsUsing(items: readonly Item[], kind: ItemListKind, entry: ListEntry | VehicleModel, lists: ItemLists): number {
  const field = ITEM_LIST_FIELDS[kind];
  const brand = "vehicleBrandId" in entry ? lists.vehicleBrands.find((held) => held.id === entry.vehicleBrandId) : undefined;
  const same = (name: string | null) => optionKey(name ?? "") === optionKey(entry.name);
  /** Whether an item uses the entry, by one of its brands or vehicles for the lists they fill. */
  const uses = (item: Item) => {
    if (field === "category") {
      return same(item.category);
    }
    if (field === "partBrand") {
      return item.brands.some((each) => same(each.partBrand));
    }
    if (field === "vehicleBrand") {
      return item.vehicles.some((vehicle) => same(vehicle.vehicleBrand));
    }
    return item.vehicles.some(
      (vehicle) => same(vehicle.vehicleModel) && brand !== undefined && optionKey(vehicle.vehicleBrand) === optionKey(brand.name),
    );
  };
  return items.filter(uses).length;
}

/**
 * Writes a new name the way the lists keep it: extra spaces dropped and the first letter capital, the rest as typed,
 * so "motor  diesel" becomes "Motor diesel" and NGK stays NGK.
 * @param text Name as typed.
 * @returns The name to save.
 */
export function listName(text: string): string {
  return capitalizeFirst(text.trim().replace(/\s+/g, " "));
}

/**
 * Loads the four lists from the API.
 * @param base Where the API is reached, e.g. "/api" on the web.
 * @param signal Cancels the requests.
 * @returns The lists; the request fails when any of them can't be loaded.
 */
export async function loadItemLists(base: string, signal?: AbortSignal): Promise<ItemLists> {
  const load = async (kind: ItemListKind) => {
    const response = await apiFetch(`${base}${ITEM_LIST_PATHS[kind]}`, { signal });
    if (!response.ok) {
      throw new Error(String(response.status));
    }
    return response.json();
  };
  const [categories, partBrands, vehicleBrands, vehicleModels] = await Promise.all([
    load("categories"),
    load("partBrands"),
    load("vehicleBrands"),
    load("vehicleModels"),
  ]);
  return {
    categories: listEntriesSchema.parse(categories),
    partBrands: listEntriesSchema.parse(partBrands),
    vehicleBrands: listEntriesSchema.parse(vehicleBrands),
    vehicleModels: vehicleModelsSchema.parse(vehicleModels),
  };
}

/**
 * Merges an entry into another of its list: the items using it move there, and it is deleted; a vehicle brand's models
 * move along, those of a name the other brand has joining its model.
 * @param base Where the API is reached, e.g. "/api" on the web.
 * @param kind The list.
 * @param id The entry merged away.
 * @param into The entry it is merged into.
 * @returns How many items moved, or null when it couldn't be merged.
 */
export async function mergeListEntries(base: string, kind: ItemListKind, id: string, into: string): Promise<number | null> {
  const response = await apiFetch(`${base}${ITEM_LIST_PATHS[kind]}/${id}/merge`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ into }),
  }).catch(() => null);
  return response?.ok ? listEntryMergedSchema.parse(await response.json()).moved : null;
}

/**
 * Words where the items of a merged entry go.
 * @param from The entry merged away.
 * @param into The entry it is merged into.
 * @param count How many items use it.
 * @returns E.g. "Os 12 itens de “Parachoque” passam para “Para-choque”", or that no item uses it.
 */
function movedItems(from: string, into: string, count: number): string {
  if (count === 0) {
    return `Nenhum item usa “${from}”`;
  }
  return count === 1 ? `O item de “${from}” passa para “${into}”` : `Os ${count} itens de “${from}” passam para “${into}”`;
}

/**
 * Renames an entry of a list, and the items that use it.
 * @param base Where the API is reached, e.g. "/api" on the web.
 * @param kind The list.
 * @param id The entry's id.
 * @param name The new name as typed.
 * @returns The entry as renamed, "taken" when another entry has the name, or null when it couldn't be renamed.
 */
export async function renameListEntry(
  base: string,
  kind: ItemListKind,
  id: string,
  name: string,
): Promise<ListEntry | VehicleModel | "taken" | null> {
  const response = await apiFetch(`${base}${ITEM_LIST_PATHS[kind]}/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  }).catch(() => null);
  if (response?.status === 409) {
    return "taken";
  }
  if (!response?.ok) {
    return null;
  }
  const body = await response.json();
  return kind === "vehicleModels" ? vehicleModelSchema.parse(body) : listEntrySchema.parse(body);
}

/**
 * Puts an entry in its list, in name order: a new one is added, and one the list holds, e.g. renamed, replaced.
 * @param lists The four lists.
 * @param kind The entry's list.
 * @param entry The entry as the API sent it.
 * @returns The lists with the entry.
 */
export function withEntry(lists: ItemLists, kind: ItemListKind, entry: ListEntry | VehicleModel): ItemLists {
  const list: ListEntry[] = lists[kind].filter((held) => held.id !== entry.id);
  return { ...lists, [kind]: [...list, entry].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) };
}

/**
 * Takes an entry out of its list; a vehicle brand takes its models with it.
 * @param lists The four lists.
 * @param kind The entry's list.
 * @param id The entry's id.
 * @returns The lists without the entry.
 */
export function withoutEntry(lists: ItemLists, kind: ItemListKind, id: string): ItemLists {
  const kept = { ...lists, [kind]: lists[kind].filter((held: ListEntry) => held.id !== id) };
  return kind === "vehicleBrands" ? { ...kept, vehicleModels: kept.vehicleModels.filter((model) => model.vehicleBrandId !== id) } : kept;
}
