import { optionKey, type ItemVehicleCreate } from "@apc/shared/items";
import { listName } from "@apc/shared/lists";
import type { Prisma } from "../generated/prisma/client.js";
import type { ListIds } from "./items.js";

// Finds the list entries an item's names stand for: its category, the part brand of one of its brands, and a vehicle
// it fits, its brand and its model within the brand. A name a list doesn't hold yet is added to it with the writing
// rule; one it holds, ignoring case, accents and extra spaces, is used as it is, so the item takes the list's spelling.

/** The columns a list entry is read with. */
const ENTRY = { id: true } as const;

/** The names an item is saved with: on an edit, only the ones that came in; or a brand's part brand, or a vehicle. */
type ItemNames = { category?: string; partBrand?: string; vehicle?: ItemVehicleCreate };

/**
 * Finds the list entries of an item's names, adding the names the lists don't hold. A vehicle's model is looked up
 * under its brand; without a model, the vehicle is any model of the brand.
 * @param tx Database client, usually in a transaction with the item's save.
 * @param names The names sent.
 * @returns The ids of the entries of the names sent: a part brand's as partBrandId, a vehicle's as vehicleBrandId and
 * vehicleModelId (null for any model).
 */
export async function listIds(
  tx: Prisma.TransactionClient,
  names: ItemNames,
): Promise<Partial<ListIds> & { partBrandId?: string; vehicleBrandId?: string; vehicleModelId?: string | null }> {
  const ids: Partial<ListIds> & { partBrandId?: string; vehicleBrandId?: string; vehicleModelId?: string | null } = {};
  if (names.category !== undefined) {
    ids.categoryId = (await tx.category.upsert({ ...listedName(names.category), select: ENTRY })).id;
  }
  if (names.partBrand !== undefined) {
    ids.partBrandId = (await tx.partBrand.upsert({ ...listedName(names.partBrand), select: ENTRY })).id;
  }
  if (names.vehicle !== undefined) {
    const brandId = (await tx.brand.upsert({ ...listedName(names.vehicle.vehicleBrand), select: ENTRY })).id;
    const model = names.vehicle.vehicleModel ?? "";
    ids.vehicleBrandId = brandId;
    ids.vehicleModelId = model.trim() ? (await tx.vehicleModel.upsert({ ...listedModel(model, brandId), select: ENTRY })).id : null;
  }
  return ids;
}

/**
 * Builds the upsert of a vehicle model in its brand's list: found by its key, or added.
 * @param text The model as sent.
 * @param brandId Its vehicle brand's id.
 * @returns The upsert's where, create and update.
 */
function listedModel(text: string, brandId: string) {
  const name = listName(text);
  return { where: { brandId_nameKey: { brandId, nameKey: optionKey(name) } }, create: { name, nameKey: optionKey(name), brandId }, update: {} };
}

/**
 * Builds the upsert of a category, part brand or vehicle brand: found by its key, or added.
 * @param text The name as sent.
 * @returns The upsert's where, create and update.
 */
function listedName(text: string) {
  const name = listName(text);
  return { where: { nameKey: optionKey(name) }, create: { name, nameKey: optionKey(name) }, update: {} };
}
