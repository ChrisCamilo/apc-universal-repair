import { z } from "zod";
import { engineDriveSchema } from "../catalog/catalog.ts";
import { itemBrandSchema, itemCreateSchema, itemPhotoSchema, itemSchema, itemUpdateSchema, MAX_QUANTITY, POSITIONS, SIDES } from "../inventory/items.ts";
import { REFUSAL_REASONS } from "../platform/api/refusals.ts";

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
// An edit carries what the phone saw of each field it changes, and a delete what it saw of the item, so the server can
// tell a field it changed meanwhile apart from one the phone left alone: such a field, changed to another value than
// the phone's, conflicts, as does an operation on an item deleted on the server, or a delete of an item changed there;
// stock moves add up and never do. An operation in conflict is answered with why, nothing of it applied and nothing
// kept, for the phone to settle, keeping the server's value or its own, and send again (see sync/conflicts.ts).

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

/** An item's own fields an edit compares one by one; its vehicles and its original codes are each one, replaced whole. */
export const SYNC_ITEM_FIELDS = ["name", "category", "vehicles", "position", "side", "minQuantity", "originalCodes", "material", "description"] as const;
/** A brand's fields an edit compares one by one; its quantity moves, which never conflict. */
export const SYNC_BRAND_FIELDS = ["partBrand", "code", "color", "location", "unitPriceCents"] as const;
/**
 * What the phone saw of an item, as the item routes send it: the fields an edit changes, or every field for a delete,
 * and its brands by id, each with its fields. A brand the edit leaves out that the phone saw is one it removes; a brand
 * the phone never saw, added on the server since, is kept.
 */
export const itemSeenSchema = itemSchema
  .pick(Object.fromEntries(SYNC_ITEM_FIELDS.map((field) => [field, true])) as Record<(typeof SYNC_ITEM_FIELDS)[number], true>)
  .partial()
  .extend({
    brands: z
      .record(
        z.uuid(),
        itemBrandSchema.pick(Object.fromEntries(SYNC_BRAND_FIELDS.map((field) => [field, true])) as Record<(typeof SYNC_BRAND_FIELDS)[number], true>).partial(),
      )
      .optional(),
  });
/**
 * Why an operation conflicts with the server: the item deleted there (an edit or a stock move on it), or changed there
 * (a delete of it); a field the server changed since the phone saw it, to another value than the phone's, with the
 * server's value; a brand the phone changed that the server deleted; or one the phone removed that the server changed.
 */
export const syncConflictSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("itemDeleted") }),
  z.object({ kind: z.literal("itemChanged") }),
  z.object({ kind: z.literal("field"), field: z.enum(SYNC_ITEM_FIELDS), theirs: z.unknown() }),
  z.object({ kind: z.literal("brandField"), brandId: z.uuid(), field: z.enum(SYNC_BRAND_FIELDS), theirs: z.unknown() }),
  z.object({ kind: z.literal("brandDeleted"), brandId: z.uuid() }),
  z.object({ kind: z.literal("brandChanged"), brandId: z.uuid() }),
]);

/** An operation a phone made away from the server, with the id it gave it. */
export const syncOperationSchema = z.discriminatedUnion("type", [
  /** A new item, with the id the phone gave it, and the ones it gave its brands. */
  z.object({ id: z.uuid(), type: z.literal("createItem"), itemId: z.uuid(), item: itemCreateSchema }),
  /** An edit of an item, as PATCH /items/:id takes it, with what the phone saw of the fields it changes. */
  z.object({ id: z.uuid(), type: z.literal("updateItem"), itemId: z.uuid(), changes: itemUpdateSchema, seen: itemSeenSchema.optional() }),
  /** A delete of an item, with what the phone saw of it. */
  z.object({ id: z.uuid(), type: z.literal("deleteItem"), itemId: z.uuid(), seen: itemSeenSchema.optional() }),
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
 * What an operation answered: applied; refused, with the status and the body's message and details the item route
 * would answer (409 for a code another item uses, 404 for an item that isn't there); or in conflict with what changed
 * on the server, with 409 and why, nothing of it applied, for the phone to settle and send again.
 */
export const syncOperationResultSchema = z.object({
  id: z.uuid(),
  status: z.enum(["applied", "refused", "conflict"]),
  statusCode: z.int(),
  message: z.string().optional(),
  reason: z.enum(REFUSAL_REASONS).optional(),
  details: z.array(z.record(z.string(), z.unknown())).optional(),
  conflicts: z.array(syncConflictSchema).optional(),
});
/** What POST /sync/operations answers: each operation's result, in the order they were sent. */
export const syncOperationsResultSchema = z.object({ results: z.array(syncOperationResultSchema) });

export type SyncKind = keyof typeof SYNC_ROWS;
export type SyncChange = z.infer<typeof syncChangeSchema>;
export type SyncChanges = z.infer<typeof syncChangesSchema>;
export type SyncChangesQuery = z.infer<typeof syncChangesQuerySchema>;
export type SyncOperation = z.infer<typeof syncOperationSchema>;
export type SyncOperationResult = z.infer<typeof syncOperationResultSchema>;
export type SyncConflict = z.infer<typeof syncConflictSchema>;
export type ItemSeen = z.infer<typeof itemSeenSchema>;
export type SyncItemField = (typeof SYNC_ITEM_FIELDS)[number];
export type SyncBrandField = (typeof SYNC_BRAND_FIELDS)[number];
