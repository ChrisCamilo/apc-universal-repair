import type { ItemImportResult } from "@apc/shared/item-csv";
import type { ItemCreate } from "@apc/shared/items";
import { prisma } from "../db/client.js";
import { createData, updateData, type ListIds } from "./items.js";
import { listIds } from "./listIds.js";

// The CSV import: the items of a file saved in one transaction, so a file goes in whole or not at all. Each item's
// category, part brand, vehicle brand and vehicle model join their lists when they aren't there yet (see listIds),
// and an item whose part code is in use, as the search compares codes (see codeKey), updates that item instead of
// adding another.

/** How long the import may take, in ms: a file has up to a thousand items. */
const IMPORT_TIMEOUT = 60_000;

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
        const ids = (await listIds(tx, input)) as ListIds;
        const data = createData(input, ids);
        const held = await tx.item.findUnique({ where: { codeKey: data.codeKey }, select: { id: true } });
        if (held) {
          await tx.item.update({ where: { id: held.id }, data: updateData(input, ids) });
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
