import type { SyncConflict, SyncOperation, SyncOperationResult } from "@apc/domain/sync";
import { deleteConflicts, mergeEdit } from "@apc/domain/sync-conflicts";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../db/client.js";
import { createItem, deleteItem, ID_TAKEN, moveStock, updateItem, type ItemChange } from "../inventory/itemChanges.js";
import { ITEM_INCLUDE, toItemValues } from "../inventory/items.js";
import { removePhotoFiles } from "../inventory/photos.js";

// Applies a phone's batch of operations (POST /sync/operations, see @apc/domain/sync), in order, each once: an
// operation is kept with its answer (SyncOperation), by the device that sent it and the id the phone gave it, in the
// transaction that applies it, so the same batch sent again, as after a dropped connection, answers what it answered
// and changes nothing, even when both arrive at once (the second finds the first's answer once it is in). Each one
// follows the item routes' rules (see inventory/itemChanges.ts) and answers the status the route would: an operation
// refused (a code another item uses, an item that isn't there) is kept as refused, and the ones after it still run. A
// new item takes the ids the phone gave it and its brands, as does a brand an edit adds, refused with 409 when one is
// already taken; a brand an edit keeps without a quantity keeps its own, as the phone sends stock as moves. The photo
// files an operation leaves behind are removed once it is in. An edit is merged with the item as it is now, field by
// field, from what the phone saw (see @apc/domain/sync-conflicts); an edit or a move on an item deleted here, an edit of
// a field changed here to another value, or a delete of an item changed here, answers its conflicts instead, with 409,
// nothing applied and nothing kept, so the phone sends it again once settled.

/** The status the item route answers each kind of operation applied with. */
const APPLIED_STATUS: Record<SyncOperation["type"], number> = { createItem: 201, updateItem: 200, deleteItem: 204, moveStock: 200 };

/**
 * Applies a batch of operations, in order.
 * @param deviceId The device that sent them.
 * @param operations The operations.
 * @returns Each one's answer, in the same order.
 */
export async function applyOperations(deviceId: string, operations: readonly SyncOperation[]): Promise<SyncOperationResult[]> {
  const results: SyncOperationResult[] = [];
  for (const operation of operations) {
    results.push(await applyOperation(deviceId, operation));
  }
  return results;
}

/**
 * Applies an operation once: answers what it answered when it was applied before, or applies it and keeps its answer.
 * @param deviceId The device that sent it.
 * @param operation The operation.
 * @returns Its answer.
 */
async function applyOperation(deviceId: string, operation: SyncOperation): Promise<SyncOperationResult> {
  const kept = () => prisma.syncOperation.findUnique({ where: { deviceId_id: { deviceId, id: operation.id } } });
  const before = await kept();
  if (before) {
    return JSON.parse(before.result) as SyncOperationResult;
  }
  try {
    const { result, files } = await prisma.$transaction(async (tx) => {
      const change = await changeOf(tx, operation);
      if ("conflicts" in change) {
        // Nothing of it applied, and nothing kept: settled on the phone, it comes again.
        return { result: { id: operation.id, status: "conflict", statusCode: 409, conflicts: change.conflicts } satisfies SyncOperationResult, files: [] };
      }
      const { rejection } = change.ok ? { rejection: undefined } : change;
      const result: SyncOperationResult = rejection
        ? { id: operation.id, status: "refused", statusCode: rejection.statusCode, message: rejection.message, details: rejection.details }
        : { id: operation.id, status: "applied", statusCode: APPLIED_STATUS[operation.type] };
      await tx.syncOperation.create({ data: { deviceId, id: operation.id, result: JSON.stringify(result) } });
      return { result, files: change.ok ? change.files : [] };
    });
    await removePhotoFiles(files);
    return result;
  } catch (error) {
    // The same operation, sent again at once, was applied by the other request meanwhile: its answer.
    const meanwhile = await kept();
    if (meanwhile) {
      return JSON.parse(meanwhile.result) as SyncOperationResult;
    }
    throw error;
  }
}

/**
 * Makes an operation's change, with the item routes' rules, unless it conflicts with what changed on the server since
 * the phone saw it (see @apc/domain/sync-conflicts): an edit or a stock move on an item deleted here, an edit of a
 * field changed here, or a delete of an item changed here.
 * @param tx Database client, in the operation's transaction.
 * @param operation The operation.
 * @returns The change made, why it was refused, or its conflicts.
 */
async function changeOf(tx: Prisma.TransactionClient, operation: SyncOperation): Promise<ItemChange<unknown> | { conflicts: SyncConflict[] }> {
  if (operation.type === "createItem") {
    const brandIds = operation.item.brands.flatMap((brand) => (brand.id ? [brand.id] : []));
    const taken = (await tx.item.count({ where: { id: operation.itemId } })) + (await tx.itemBrand.count({ where: { id: { in: brandIds } } }));
    if (taken > 0) {
      return { ok: false, rejection: ID_TAKEN };
    }
    return createItem(tx, operation.item, { itemId: operation.itemId });
  }
  const row = await tx.item.findUnique({ where: { id: operation.itemId }, include: ITEM_INCLUDE });
  if (!row) {
    // A delete of an item already gone is refused as the route refuses it.
    return operation.type === "deleteItem" ? deleteItem(tx, operation.itemId) : { conflicts: [{ kind: "itemDeleted" }] };
  }
  switch (operation.type) {
    case "updateItem": {
      const merged = mergeEdit(toItemValues(row), operation.changes, operation.seen);
      return merged.conflicts.length > 0 ? { conflicts: merged.conflicts } : updateItem(tx, operation.itemId, merged.changes, { newBrandIds: true });
    }
    case "deleteItem": {
      const conflicts = deleteConflicts(toItemValues(row), operation.seen);
      return conflicts.length > 0 ? { conflicts } : deleteItem(tx, operation.itemId);
    }
    case "moveStock":
      return moveStock(tx, operation.itemId, operation.brandId, operation.delta);
  }
}
