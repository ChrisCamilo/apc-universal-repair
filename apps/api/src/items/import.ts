import type { ItemImportResult } from "@apc/shared/item-csv";
import { optionKey, type ItemCreate } from "@apc/shared/items";
import { listName } from "@apc/shared/lists";
import { prisma } from "../db/client.js";
import { createData } from "./items.js";

// The CSV import: the items of a file saved in one transaction, so a file goes in whole or not at all. Each item's
// category, part brand, vehicle brand and vehicle model join their lists when they aren't there yet, and the item
// takes the spelling the lists have; an item whose part code is in use updates that item instead of adding another.

/** How long the import may take, in ms: a file has up to a thousand items. */
const IMPORT_TIMEOUT = 60_000;
/** The columns a list entry is read with. */
const NAME = { id: true, name: true } as const;

/**
 * Finds a vehicle model in its brand's list, or adds it; nothing changes for a model the brand has.
 * @param text The model as sent.
 * @param brandId Its vehicle brand's id.
 * @returns The upsert arguments of the vehicle model.
 */
function listedModel(text: string, brandId: string) {
  const name = listName(text);
  return {
    where: { brandId_nameKey: { brandId, nameKey: optionKey(name) } },
    create: { name, nameKey: optionKey(name), brandId },
    update: {},
    select: NAME,
  };
}

/**
 * Finds a name in a list of plain names, or adds it; nothing changes for a name the list has.
 * @param text The name as sent.
 * @returns The upsert arguments of a category, part brand or vehicle brand.
 */
function listedName(text: string) {
  const name = listName(text);
  return { where: { nameKey: optionKey(name) }, create: { name, nameKey: optionKey(name) }, update: {}, select: NAME };
}

/**
 * Saves the items of a CSV file, creating the list names they use that are new.
 * @param items The valid rows' items, checked with itemCreateSchema.
 * @returns How many items were created and how many updated.
 */
export async function importItems(items: readonly ItemCreate[]): Promise<ItemImportResult> {
  return prisma.$transaction(
    async (tx) => {
      const result = { created: 0, updated: 0 };
      for (const input of items) {
        const category = await tx.category.upsert(listedName(input.category));
        const partBrand = await tx.partBrand.upsert(listedName(input.partBrand));
        const vehicleBrand = await tx.brand.upsert(listedName(input.vehicleBrand));
        const model = input.vehicleModel?.trim()
          ? await tx.vehicleModel.upsert(listedModel(input.vehicleModel, vehicleBrand.id))
          : null;
        const data = createData({
          ...input,
          category: category.name,
          partBrand: partBrand.name,
          vehicleBrand: vehicleBrand.name,
          vehicleModel: model?.name ?? "",
        });
        const held = await tx.item.findUnique({ where: { code: data.code }, select: { id: true } });
        if (held) {
          await tx.item.update({ where: { id: held.id }, data });
          result.updated++;
        } else {
          await tx.item.create({ data });
          result.created++;
        }
      }
      return result;
    },
    { timeout: IMPORT_TIMEOUT },
  );
}
