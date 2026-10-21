import type { ItemImportResult } from "@apc/shared/item-csv";
import type { ItemCreate } from "@apc/shared/items";
import { prisma } from "../db/client.js";
import { brandData, createData, syncQuantity, updateData, type ListIds } from "./items.js";
import { listIds } from "./listIds.js";

// The CSV import: the items of a file saved in one transaction, so a file goes in whole or not at all. Each item's
// category, vehicle brand, vehicle model and its brands' part brands join their lists when they aren't there yet (see
// listIds). An item whose brands' part codes are in use, as the search compares codes (see codeKey), updates the item
// those codes belong to instead of adding another: the brands of codes in use change, and the others join it. An
// import that can't be saved so is refused whole (ImportConflict): codes of two different items in one, or a new code
// for a part brand the item already has under another code.

/** How long the import may take, in ms: a file has up to a thousand items. */
const IMPORT_TIMEOUT = 60_000;

/** Why the items of a file can't be saved as they are; the routes answer it with 409. */
export class ImportConflict extends Error {}

/**
 * Saves the items of a CSV file, creating the list names they use that are new.
 * @param items The items of the file's rows, each with its brands, checked with itemCreateSchema.
 * @returns How many items were created and how many updated.
 */
export async function importItems(items: readonly ItemCreate[]): Promise<ItemImportResult> {
  return prisma.$transaction(
    async (tx) => {
      const result = { created: 0, updated: 0 };
      for (const input of items) {
        const ids = (await listIds(tx, input)) as ListIds;
        const brands = [];
        for (const [position, brand] of input.brands.entries()) {
          brands.push(brandData(brand, (await listIds(tx, { partBrand: brand.partBrand })).partBrandId!, position));
        }
        const held = await tx.itemBrand.findMany({
          where: { codeKey: { in: brands.map((brand) => brand.codeKey) } },
          select: { id: true, codeKey: true, itemId: true },
        });
        const owners = [...new Set(held.map((brand) => brand.itemId))];
        if (owners.length > 1) {
          throw new ImportConflict(`The codes of "${input.name}" belong to ${owners.length} different items.`);
        }
        if (owners.length === 0) {
          await tx.item.create({ data: { ...createData(input, ids), brands: { create: brands } } });
          result.created++;
          continue;
        }
        const [itemId] = owners;
        await tx.item.update({ where: { id: itemId }, data: updateData(input, ids) });
        const itemBrands = await tx.itemBrand.findMany({ where: { itemId }, select: { codeKey: true, partBrandId: true } });
        // The brands that join the item go after the ones it has; the ones it has keep their places.
        let next = itemBrands.length;
        for (const [index, brand] of brands.entries()) {
          const same = held.find((row) => row.codeKey === brand.codeKey);
          if (same) {
            await tx.itemBrand.update({ where: { id: same.id }, data: { ...brand, position: undefined } });
          } else if (itemBrands.some((row) => row.partBrandId === brand.partBrandId)) {
            throw new ImportConflict(
              `"${input.name}" already has the part brand "${input.brands[index].partBrand}" under another code than ${brand.code}.`,
            );
          } else {
            await tx.itemBrand.create({ data: { ...brand, position: next++, itemId } });
          }
        }
        await syncQuantity(tx, itemId);
        result.updated++;
      }
      return result;
    },
    { timeout: IMPORT_TIMEOUT },
  );
}

