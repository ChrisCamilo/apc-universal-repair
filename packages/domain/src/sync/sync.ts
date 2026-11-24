import { z } from "zod";
import { engineDriveSchema } from "../catalog/catalog.ts";
import { itemCreateSchema, itemPhotoSchema, itemUpdateSchema, MAX_QUANTITY, POSITIONS, SIDES } from "../inventory/items.ts";

// The server's change feed, which a phone's copy of the inventory follows (GET /sync/changes): every row of the
// inventory, its lists and the catalog, as its table keeps it, each with a version that grows with every change of it,
// and every row deleted, as a change with no row. A page answers the changes after a cursor, oldest first, with the
// cursor to ask from next and whether more are waiting; asked without a cursor, it answers every row there is, for a
// full copy, and in its later pages the rows deleted once it started. Rows come in the order of their last change, so one can come before a row it references, even a page
// before: a copy takes every page before it checks references. An item comes with its vehicles and original codes, and
// a change to them gives the item a new version; its brands and their photos come apart, the photos at paths signed for
// the caller's session, as the item routes send them. A cursor the server can't follow (older than the deletions it
// keeps, or of another database, as after moving the server to another one) answers 410: the copy is made again.
// A phone sends the changes it made away from the server as a batch of operations (POST /sync/operations), each with
// an id of its own: creating an item (with the ids the phone gave it and its brands), editing it (a brand it adds with
// the id the phone gave it, and one it keeps without a quantity keeping its own), deleting it, and a stock move on one
// of its brands. They take the shape of the item routes' bodies, list entries by name, and are
// applied in order, each once, with the item routes' rules; each one answers whether it was applied, or why not, with
// the status the item route would answer. The phone then reads the feed from its cursor, which brings back what changed.

/** The feed's path. */
export const SYNC_CHANGES_PATH = "/sync/changes";
/** How many changes a page holds when no limit is asked. */
export const SYNC_PAGE_SIZE = 500;
/** The most changes a page can hold. */
export const SYNC_PAGE_SIZE_MAX = 1000;
/** The operations' path. */
export const SYNC_OPERATIONS_PATH = "/sync/operations";
/** The most operations a batch can hold. */
export const SYNC_OPERATIONS_MAX = 100;

/** An entry of a list of names: categories, part brands and vehicle brands. */
const nameEntrySchema = z.object({ id: z.string(), name: z.string() });
/** Each kind of row the feed sends, by the name it gives it, with the columns it sends. */
export const SYNC_ROWS = {
  category: nameEntrySchema,
  partBrand: nameEntrySchema,
  vehicleBrand: nameEntrySchema,
  vehicleModel: nameEntrySchema.extend({ brandId: z.string() }),
  catalogBrand: z.object({ id: z.string(), brandId: z.string(), mark: z.string(), position: z.int() }),
  catalogModel: z.object({ id: z.string(), vehicleModelId: z.string(), position: z.int() }),
  catalogGeneration: z.object({
    id: z.string(),
    modelId: z.string(),
    position: z.int(),
    name: z.string(),
    firstYear: z.int(),
    lastYear: z.int().nullable(),
  }),
  catalogVersion: z.object({ id: z.string(), generationId: z.string(), position: z.int(), name: z.string() }),
  /** A period of a version, its first year named year, as the catalog route sends it. */
  catalogYear: z.object({ id: z.string(), versionId: z.string(), position: z.int(), year: z.int(), lastYear: z.int() }),
  catalogEngine: z.object({
    id: z.string(),
    yearId: z.string(),
    position: z.int(),
    displacementDl: z.int(),
    cylinders: z.int(),
    drive: engineDriveSchema,
    summary: z.string(),
  }),
  /** An item, its position and side as the item routes speak them, with its vehicles and original codes in order. */
  item: z.object({
    id: z.string(),
    name: z.string(),
    categoryId: z.string(),
    vehicles: z.array(
      z.object({
        vehicleBrandId: z.string(),
        vehicleModelId: z.string().nullable(),
        generationId: z.string().nullable(),
        versionId: z.string().nullable(),
      }),
    ),
    position: z.enum(POSITIONS),
    side: z.enum(SIDES),
    quantity: z.int(),
    minQuantity: z.int(),
    originalCodes: z.array(z.string()),
    material: z.string().nullable(),
    description: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
  itemBrand: z.object({
    id: z.string(),
    itemId: z.string(),
    position: z.int(),
    partBrandId: z.string(),
    code: z.string(),
    color: z.string(),
    location: z.string().nullable(),
    quantity: z.int(),
    unitPriceCents: z.int(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
  itemPhoto: itemPhotoSchema.extend({ brandId: z.string(), position: z.int() }),
};

/**
 * Builds the schema of a change of one kind: the row as it is now, or null once deleted.
 * @param kind The kind of row.
 * @param row Its row's schema, from SYNC_ROWS.
 * @returns The schema.
 */
function changeOf<Kind extends SyncKind, Row extends (typeof SYNC_ROWS)[Kind]>(kind: Kind, row: Row) {
  return z.object({ kind: z.literal(kind), id: z.string(), version: z.int().positive(), row: row.nullable() as z.ZodNullable<Row> });
}

export const syncChangeSchema = z.discriminatedUnion("kind", [
  changeOf("category", SYNC_ROWS.category),
  changeOf("partBrand", SYNC_ROWS.partBrand),
  changeOf("vehicleBrand", SYNC_ROWS.vehicleBrand),
  changeOf("vehicleModel", SYNC_ROWS.vehicleModel),
  changeOf("catalogBrand", SYNC_ROWS.catalogBrand),
  changeOf("catalogModel", SYNC_ROWS.catalogModel),
  changeOf("catalogGeneration", SYNC_ROWS.catalogGeneration),
  changeOf("catalogVersion", SYNC_ROWS.catalogVersion),
  changeOf("catalogYear", SYNC_ROWS.catalogYear),
  changeOf("catalogEngine", SYNC_ROWS.catalogEngine),
  changeOf("item", SYNC_ROWS.item),
  changeOf("itemBrand", SYNC_ROWS.itemBrand),
  changeOf("itemPhoto", SYNC_ROWS.itemPhoto),
]);
/** What GET /sync/changes is asked: the cursor of the last page, or none for a full copy, and the most changes to send. */
export const syncChangesQuerySchema = z.object({
  since: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(SYNC_PAGE_SIZE_MAX).optional(),
});
/** A page of the feed: its changes, oldest first, the cursor to ask from next, and whether more are waiting. */
export const syncChangesSchema = z.object({ changes: z.array(syncChangeSchema), cursor: z.string(), more: z.boolean() });

/** An operation a phone made away from the server, with the id it gave it. */
export const syncOperationSchema = z.discriminatedUnion("type", [
  /** A new item, with the id the phone gave it, and the ones it gave its brands. */
  z.object({ id: z.uuid(), type: z.literal("createItem"), itemId: z.uuid(), item: itemCreateSchema }),
  /** An edit of an item, as PATCH /items/:id takes it. */
  z.object({ id: z.uuid(), type: z.literal("updateItem"), itemId: z.uuid(), changes: itemUpdateSchema }),
  z.object({ id: z.uuid(), type: z.literal("deleteItem"), itemId: z.uuid() }),
  /** A stock move on a brand of an item: how many came in (positive) or went out (negative). */
  z.object({
    id: z.uuid(),
    type: z.literal("moveStock"),
    itemId: z.uuid(),
    brandId: z.uuid(),
    delta: z
      .int()
      .min(-MAX_QUANTITY)
      .max(MAX_QUANTITY)
      .refine((delta) => delta !== 0, "A move changes the stock."),
  }),
]);
/** What POST /sync/operations is sent: the operations, in the order they were made. */
export const syncOperationsSchema = z.object({ operations: z.array(syncOperationSchema).min(1).max(SYNC_OPERATIONS_MAX) });
/**
 * What an operation answered: applied, or refused, with the status and the body's message and details the item route
 * would answer (409 for a code another item uses, 404 for an item that isn't there).
 */
export const syncOperationResultSchema = z.object({
  id: z.uuid(),
  status: z.enum(["applied", "refused"]),
  statusCode: z.int(),
  message: z.string().optional(),
  details: z.array(z.record(z.string(), z.unknown())).optional(),
});
/** What POST /sync/operations answers: each operation's result, in the order they were sent. */
export const syncOperationsResultSchema = z.object({ results: z.array(syncOperationResultSchema) });

export type SyncKind = keyof typeof SYNC_ROWS;
export type SyncChange = z.infer<typeof syncChangeSchema>;
export type SyncChanges = z.infer<typeof syncChangesSchema>;
export type SyncChangesQuery = z.infer<typeof syncChangesQuerySchema>;
export type SyncOperation = z.infer<typeof syncOperationSchema>;
export type SyncOperationResult = z.infer<typeof syncOperationResultSchema>;
