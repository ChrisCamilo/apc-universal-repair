import { optionKey, type Item } from "../inventory/items.ts";
import { itemListsOf } from "../inventory/testLists.ts";
import type { SyncChange, SyncChanges } from "./sync.ts";

// The change feed of a stock of test items, as the server would send it for a full copy, so a test answers
// GET /sync/changes from the same items it answers the other routes with. The lists' entries keep the ids itemListsOf
// gives them; a vehicle with years gets a catalog model, with generations up to its number, and its version.

/**
 * Answers a request to the change feed from a stock of test items, as a fetch stub returns it: a full copy of the stock
 * as it is now, and 410 to a cursor, so a copy made before is made again with every change in it.
 * @param query The request's query.
 * @param items The items in stock.
 * @returns The answer.
 */
export function syncAnswer(query: URLSearchParams, items: readonly Item[]) {
  return query.has("since")
    ? { ok: false, status: 410, json: () => Promise.resolve({ statusCode: 410, error: "Gone", message: "Make a full copy." }) }
    : { ok: true, status: 200, json: () => Promise.resolve(syncPageOf(items)) };
}

/**
 * Builds the one page of a full copy of some items.
 * @param items The items in stock.
 * @param cursor The cursor the page ends at.
 * @returns The page: every row, nothing more waiting.
 */
export function syncPageOf(items: readonly Item[], cursor = "test-database.1"): SyncChanges {
  const lists = itemListsOf(items);
  const changes: SyncChange[] = [];
  /** Adds the change of a row, with the next version. */
  const add = (change: Omit<SyncChange, "version">) => changes.push({ ...change, version: changes.length + 1 } as SyncChange);
  /** Finds the id of an entry of a list by its name. */
  const idOf = (entries: readonly { id: string; name: string }[], name: string) => entries.find((entry) => optionKey(entry.name) === optionKey(name))!.id;

  for (const entry of lists.categories) add({ kind: "category", id: entry.id, row: { id: entry.id, name: entry.name } });
  for (const entry of lists.partBrands) add({ kind: "partBrand", id: entry.id, row: { id: entry.id, name: entry.name } });
  for (const entry of lists.vehicleBrands) add({ kind: "vehicleBrand", id: entry.id, row: { id: entry.id, name: entry.name } });
  for (const model of lists.vehicleModels) {
    add({ kind: "vehicleModel", id: model.id, row: { id: model.id, name: model.name, brandId: model.vehicleBrandId } });
  }
  // The catalog's generations and versions the items' vehicles name, by "model id/number" and "generation id/name".
  const generations = new Map<string, string>();
  const versions = new Map<string, string>();
  for (const item of items) {
    const vehicles = item.vehicles.map((vehicle) => {
      const brandId = idOf(lists.vehicleBrands, vehicle.vehicleBrand);
      const modelId = vehicle.vehicleModel
        ? lists.vehicleModels.find((model) => model.vehicleBrandId === brandId && optionKey(model.name) === optionKey(vehicle.vehicleModel!))!.id
        : null;
      let generationId: string | null = null;
      let versionId: string | null = null;
      if (modelId && vehicle.firstYear != null) {
        const catalogModelId = `catalog-model-${modelId}`;
        if (![...generations.keys()].some((key) => key.startsWith(`${catalogModelId}/`))) {
          add({ kind: "catalogModel", id: catalogModelId, row: { id: catalogModelId, vehicleModelId: modelId, position: 0 } });
        }
        const number = vehicle.generationNumber ?? 1;
        for (let place = 1; place <= number; place++) {
          const key = `${catalogModelId}/${place}`;
          if (!generations.has(key) || place === number) {
            const id = generations.get(key) ?? `generation-${generations.size + 1}`;
            generations.set(key, id);
            const years = place === number ? { firstYear: vehicle.firstYear, lastYear: vehicle.lastYear ?? null } : { firstYear: 1900, lastYear: 1900 };
            add({ kind: "catalogGeneration", id, row: { id, modelId: catalogModelId, position: place - 1, name: `G${place}`, ...years } });
          }
        }
        generationId = generations.get(`${catalogModelId}/${number}`)!;
        if (vehicle.version) {
          const key = `${generationId}/${vehicle.version}`;
          if (!versions.has(key)) {
            const id = `version-${versions.size + 1}`;
            versions.set(key, id);
            add({ kind: "catalogVersion", id, row: { id, generationId, position: versions.size - 1, name: vehicle.version } });
          }
          versionId = versions.get(key)!;
        }
      }
      return { vehicleBrandId: brandId, vehicleModelId: modelId, generationId, versionId };
    });
    add({
      kind: "item",
      id: item.id,
      row: {
        id: item.id,
        name: item.name,
        categoryId: idOf(lists.categories, item.category),
        vehicles,
        position: item.position,
        side: item.side,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        originalCodes: item.originalCodes,
        material: item.material ?? null,
        description: item.description ?? null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    });
    for (const [position, brand] of item.brands.entries()) {
      const { photos, partBrand, ...own } = brand;
      add({
        kind: "itemBrand",
        id: brand.id,
        row: { ...own, itemId: item.id, position, partBrandId: idOf(lists.partBrands, partBrand), createdAt: item.createdAt, updatedAt: item.updatedAt },
      });
      for (const [place, photo] of photos.entries()) {
        add({ kind: "itemPhoto", id: photo.id, row: { ...photo, brandId: brand.id, position: place } });
      }
    }
  }
  return { changes, cursor, more: false };
}
