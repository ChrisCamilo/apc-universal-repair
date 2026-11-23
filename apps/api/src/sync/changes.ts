import type { SyncChange, SyncChanges, SyncChangesQuery, SyncKind } from "@apc/domain/sync";
import { SYNC_PAGE_SIZE } from "@apc/domain/sync";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../db/client.js";
import { databaseProvider, databaseUrl } from "../db/provider.js";
import type { ActiveSession } from "../auth/sessions.js";
import { labelOf, POSITION_VALUES, SIDE_VALUES, VEHICLE_ORDER } from "../inventory/items.js";
import { photoOf } from "../inventory/photos.js";

// Reads the change feed (see @apc/domain/sync) from the versions and tombstones the database's triggers keep (see
// SyncState in prisma/schema.prisma): the first rows of each synced table after the cursor's version, by version, and
// the tombstones after it, merged in order and cut at the page's size. A row's version is unique across tables, so the
// last one sent is where the next page reads from, and the last page, which sent everything, moves the cursor to the
// database's version. Everything is read in one snapshot (REPEATABLE READ on PostgreSQL, a read transaction on
// SQLite), and versions are committed in order (see SyncState), so a write committed meanwhile can't slip in with a
// version below one already seen. A cursor names the database, and the version the rows and the tombstones are read
// after: the same one, but for a full copy, asked without a cursor, which reads every row and only the deletions made
// once it started, as it holds none of the rows deleted before; its pages keep both until the last. A cursor of
// another database, from after this one's version (a copy restored from before it) or reading tombstones from before
// the last one dropped can't learn every change, so it reads as none. Tombstones are kept TOMBSTONE_DAYS (see
// pruneTombstones, run as the server starts).

/** How long a deletion stays in the feed, in days: a copy that waits longer is made again. */
export const TOMBSTONE_DAYS = 90;
/** A day, in milliseconds. */
const DAY_MS = 86_400_000;

/** The first rows of a table after a version, by version, at most a number of them. */
type After = { where: { syncVersion: { gt: number } }; orderBy: { syncVersion: "asc" }; take: number };
/** How a kind's rows are read: from the transaction, after a version, for the caller (whose session signs photos). */
type Reader = (tx: Prisma.TransactionClient, after: After, session: ActiveSession) => Promise<SyncChange[]>;

/**
 * Turns rows read with their version into changes of a kind.
 * @param kind The kind.
 * @param rows The rows, each with its id, its syncVersion and the columns sent.
 * @param toRow What the feed sends of a row; the columns read, as they are, without one.
 * @returns The changes.
 */
function changesOf<Row extends { id: string }>(
  kind: SyncKind,
  rows: (Row & { syncVersion: number })[],
  toRow: (row: Row) => object = (row) => row,
): SyncChange[] {
  return rows.map(({ syncVersion, ...row }) => ({ kind, id: row.id, version: syncVersion, row: toRow(row as unknown as Row) }) as SyncChange);
}

/** The columns read of each list's entry and catalog node, the ones the feed sends, with the row's version. */
const ENTRY = { id: true, name: true, syncVersion: true } as const;
/** The columns read of an item: what the feed sends, its vehicles and original codes in order. */
const ITEM = {
  id: true,
  name: true,
  categoryId: true,
  vehicles: { orderBy: VEHICLE_ORDER, select: { vehicleBrandId: true, vehicleModelId: true, generationId: true, versionId: true } },
  position: true,
  side: true,
  quantity: true,
  minQuantity: true,
  originalCodes: { orderBy: { position: "asc" }, select: { code: true } },
  material: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  syncVersion: true,
} satisfies Prisma.ItemSelect;
/** The columns read of an item's brand. */
const ITEM_BRAND = {
  id: true,
  itemId: true,
  position: true,
  partBrandId: true,
  code: true,
  color: true,
  location: true,
  quantity: true,
  unitPriceCents: true,
  createdAt: true,
  updatedAt: true,
  syncVersion: true,
} satisfies Prisma.ItemBrandSelect;

/** Each kind's reader. */
const READERS: Record<SyncKind, Reader> = {
  category: async (tx, after) => changesOf("category", await tx.category.findMany({ ...after, select: ENTRY })),
  partBrand: async (tx, after) => changesOf("partBrand", await tx.partBrand.findMany({ ...after, select: ENTRY })),
  vehicleBrand: async (tx, after) => changesOf("vehicleBrand", await tx.brand.findMany({ ...after, select: ENTRY })),
  vehicleModel: async (tx, after) => changesOf("vehicleModel", await tx.vehicleModel.findMany({ ...after, select: { ...ENTRY, brandId: true } })),
  catalogBrand: async (tx, after) =>
    changesOf("catalogBrand", await tx.catalogBrand.findMany({ ...after, select: { id: true, brandId: true, mark: true, position: true, syncVersion: true } })),
  catalogModel: async (tx, after) =>
    changesOf("catalogModel", await tx.catalogModel.findMany({ ...after, select: { id: true, vehicleModelId: true, position: true, syncVersion: true } })),
  catalogGeneration: async (tx, after) =>
    changesOf(
      "catalogGeneration",
      await tx.catalogGeneration.findMany({
        ...after,
        select: { ...ENTRY, modelId: true, position: true, firstYear: true, lastYear: true },
      }),
    ),
  catalogVersion: async (tx, after) =>
    changesOf("catalogVersion", await tx.catalogVersion.findMany({ ...after, select: { ...ENTRY, generationId: true, position: true } })),
  catalogYear: async (tx, after) =>
    changesOf(
      "catalogYear",
      await tx.catalogYear.findMany({ ...after, select: { id: true, versionId: true, position: true, year: true, lastYear: true, syncVersion: true } }),
    ),
  catalogEngine: async (tx, after) =>
    changesOf(
      "catalogEngine",
      await tx.catalogEngine.findMany({
        ...after,
        select: { id: true, yearId: true, position: true, displacementDl: true, cylinders: true, drive: true, summary: true, syncVersion: true },
      }),
    ),
  item: async (tx, after) =>
    changesOf("item", await tx.item.findMany({ ...after, select: ITEM }), ({ originalCodes, position, side, createdAt, updatedAt, ...row }) => ({
      ...row,
      position: labelOf(POSITION_VALUES, position),
      side: labelOf(SIDE_VALUES, side),
      originalCodes: originalCodes.map((original) => original.code),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    })),
  itemBrand: async (tx, after) =>
    changesOf("itemBrand", await tx.itemBrand.findMany({ ...after, select: ITEM_BRAND }), ({ createdAt, updatedAt, ...row }) => ({
      ...row,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    })),
  itemPhoto: async (tx, after, session) =>
    changesOf("itemPhoto", await tx.itemPhoto.findMany(after), (row) => ({ ...photoOf(row, session), brandId: row.brandId, position: row.position })),
};

/** Where a cursor reads from: the rows after one version, and the tombstones after another. */
type Cursor = { databaseId: string; rows: number; tombstones: number };

/**
 * Writes a cursor: "<database's id>.<version>", or "<database's id>.<rows' version>.<tombstones' version>" while a
 * full copy is under way.
 * @param cursor The database and where the next page reads from.
 * @returns The cursor.
 */
export function cursorOf({ databaseId, rows, tombstones }: Cursor): string {
  return rows === tombstones ? `${databaseId}.${rows}` : `${databaseId}.${rows}.${tombstones}`;
}

/**
 * Reads a cursor.
 * @param since The cursor as sent.
 * @returns Where it reads from, or null for text that isn't a cursor.
 */
function readCursor(since: string): Cursor | null {
  const [databaseId, rows = "", tombstones = rows, ...rest] = since.split(".");
  return /^\d+$/.test(rows) && /^\d+$/.test(tombstones) && rest.length === 0
    ? { databaseId, rows: Number(rows), tombstones: Number(tombstones) }
    : null;
}

/**
 * Reads the page of the feed after a cursor.
 * @param query The cursor, or none for a full copy, and the most changes to send.
 * @param session The caller's session, which the photos' paths are signed for.
 * @returns The page, or null when the cursor can't learn every change since: the copy is made again.
 */
export async function readChanges({ since, limit = SYNC_PAGE_SIZE }: SyncChangesQuery, session: ActiveSession): Promise<SyncChanges | null> {
  return prisma.$transaction(
    async (tx) => {
      const state = await tx.syncState.findUniqueOrThrow({ where: { id: 1 } });
      // A full copy reads every row, and only the deletions from now on, as it holds none of the rows deleted before.
      const from = since === undefined ? { databaseId: state.databaseId, rows: 0, tombstones: state.version } : readCursor(since);
      if (
        !from ||
        from.databaseId !== state.databaseId ||
        from.tombstones < state.prunedVersion ||
        Math.max(from.rows, from.tombstones) > state.version
      ) {
        return null;
      }
      const after: After = { where: { syncVersion: { gt: from.rows } }, orderBy: { syncVersion: "asc" }, take: limit + 1 };
      const read: SyncChange[] = [];
      for (const reader of Object.values(READERS)) {
        read.push(...(await reader(tx, after, session)));
      }
      const tombstones = await tx.syncTombstone.findMany({ where: { version: { gt: from.tombstones } }, orderBy: { version: "asc" }, take: limit + 1 });
      read.push(...tombstones.map((tombstone) => ({ kind: tombstone.kind, id: tombstone.rowId, version: tombstone.version, row: null }) as SyncChange));
      const changes = read.sort((a, b) => a.version - b.version).slice(0, limit);
      const more = read.length > limit;
      // The last page has sent every change up to the snapshot's version; a page before it, every one up to its last.
      const last = more ? changes.at(-1)!.version : state.version;
      return { changes, cursor: cursorOf({ databaseId: state.databaseId, rows: last, tombstones: Math.max(from.tombstones, last) }), more };
    },
    databaseProvider(databaseUrl()) === "postgresql" ? { isolationLevel: "RepeatableRead" } : {},
  );
}

/**
 * Drops the tombstones older than TOMBSTONE_DAYS, noting the last one's version, before which a cursor reads as none.
 * @param now The time to count from.
 * @returns How many were dropped.
 */
export async function pruneTombstones(now = new Date()): Promise<number> {
  const before = new Date(now.getTime() - TOMBSTONE_DAYS * DAY_MS);
  const last = await prisma.syncTombstone.findFirst({ where: { deletedAt: { lt: before } }, orderBy: { version: "desc" }, select: { version: true } });
  if (!last) {
    return 0;
  }
  const [{ count }] = await prisma.$transaction([
    prisma.syncTombstone.deleteMany({ where: { version: { lte: last.version } } }),
    prisma.syncState.update({ where: { id: 1 }, data: { prunedVersion: last.version } }),
  ]);
  return count;
}
