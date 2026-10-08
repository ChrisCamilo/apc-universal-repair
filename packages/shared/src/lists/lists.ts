import { z } from "zod";
import { capitalizeFirst, optionKey } from "../items/items.ts";

// The lists an item's category, part brand, vehicle brand and vehicle model are picked from, kept by the API and
// grown from the item form: each name is unique ignoring case, accents and extra spaces (a vehicle model within its
// vehicle brand), so creating a name that already exists gives back the existing one. Web and mobile load the four
// lists and create in them the same way, each through its own API address.

/** The four lists before they load: all empty. */
export const EMPTY_ITEM_LISTS: ItemLists = { categories: [], partBrands: [], vehicleBrands: [], vehicleModels: [] };
/** The API path of each list. */
export const ITEM_LIST_PATHS: Record<ItemListKind, string> = {
  categories: "/categories",
  partBrands: "/part-brands",
  vehicleBrands: "/vehicle-brands",
  vehicleModels: "/vehicle-models",
};
/** The toasts of creating in each list: the name created, or that it couldn't be. */
export const ITEM_LIST_TOASTS: Record<ItemListKind, { created: (name: string) => string; failed: string }> = {
  categories: {
    created: (name) => `Categoria “${name}” criada.`,
    failed: "Não foi possível criar a categoria. Tente de novo.",
  },
  partBrands: {
    created: (name) => `Marca de peça “${name}” criada.`,
    failed: "Não foi possível criar a marca de peça. Tente de novo.",
  },
  vehicleBrands: {
    created: (name) => `Marca de veículo “${name}” criada.`,
    failed: "Não foi possível criar a marca de veículo. Tente de novo.",
  },
  vehicleModels: {
    created: (name) => `Modelo “${name}” criado.`,
    failed: "Não foi possível criar o modelo. Tente de novo.",
  },
};
export const listEntrySchema = z.object({ id: z.uuid(), name: z.string() });
export const listEntriesSchema = z.array(listEntrySchema);
export const listEntryCreateSchema = z.object({ name: z.string().trim().min(1, "Required.") });
/** A vehicle model, which always belongs to a vehicle brand. */
export const vehicleModelSchema = listEntrySchema.extend({ vehicleBrandId: z.uuid() });
export const vehicleModelCreateSchema = listEntryCreateSchema.extend({ vehicleBrandId: z.uuid() });
export const vehicleModelsSchema = z.array(vehicleModelSchema);

/** One of the four lists. */
export type ItemListKind = "categories" | "partBrands" | "vehicleBrands" | "vehicleModels";
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
  const response = await fetch(`${base}${ITEM_LIST_PATHS[kind]}`, {
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
    const response = await fetch(`${base}${ITEM_LIST_PATHS[kind]}`, { signal });
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
 * Adds a created entry to its list, in name order, unless the list already holds it.
 * @param lists The four lists.
 * @param kind The list the entry was created in.
 * @param entry The entry as the API sent it.
 * @returns The lists with the entry.
 */
export function withEntry(lists: ItemLists, kind: ItemListKind, entry: ListEntry | VehicleModel): ItemLists {
  const list: ListEntry[] = lists[kind];
  if (list.some((held) => held.id === entry.id)) {
    return lists;
  }
  return { ...lists, [kind]: [...list, entry].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) };
}
