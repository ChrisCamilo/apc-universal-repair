import type { FastifyInstance, FastifyReply } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import {
  itemCreateSchema,
  itemIdParamsSchema,
  itemListQuerySchema,
  itemListResponseSchema,
  itemSchema,
  itemUpdateSchema,
  sortItems,
} from "@apc/domain/items";
import { itemImportResultSchema, itemImportSchema } from "@apc/domain/item-csv";
import { prisma } from "../../db/client.js";
import { importItems, ImportConflict } from "../import.js";
import { createItem, deleteItem, ITEM_NOT_FOUND, updateItem, type ItemRejection } from "../itemChanges.js";
import { ITEM_INCLUDE, itemWhere, SORT_SELECT, toItem, toSortable } from "../items.js";
import { removePhotoFiles } from "../photos.js";

// CRUD of inventory items, each with the brands that make its part. The list shows the newest items first, or sorted
// by a column when asked, one page of them when a page size is asked, with how many items match in all. A sort
// compares text the way people read it in pt-BR (see sortItems), which the database can't, so it reads what the
// matching items sort by, sorts them here and then loads only the page asked. Creating, editing and deleting follow
// the rules a phone's batch of operations follows too (see itemChanges.ts), each in one transaction, the photo files a
// change leaves behind removed once it is in. POST /items/import saves the items of a CSV file at once (see
// importItems).

/**
 * Answers 409 for an import that can't be saved as it is.
 * @param reply Reply to send.
 * @param message Why, from ImportConflict.
 * @returns The sent reply.
 */
function importConflict(reply: FastifyReply, message: string) {
  return reply.status(409).send({ statusCode: 409, error: "Conflict", message });
}

/**
 * Answers 404 for an item id that doesn't exist.
 * @param reply Reply to send.
 * @returns The sent reply.
 */
export function notFound(reply: FastifyReply) {
  return refuse(reply, ITEM_NOT_FOUND);
}

/**
 * Answers a refused change with its status and body.
 * @param reply Reply to send.
 * @param rejection Why the change was refused.
 * @returns The sent reply.
 */
function refuse(reply: FastifyReply, rejection: ItemRejection) {
  return reply.status(rejection.statusCode).send(rejection);
}

export function registerItemRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/items",
    { schema: { querystring: itemListQuerySchema, response: { 200: itemListResponseSchema } } },
    async (request) => {
      const { page = 1, pageSize, sort, order = "asc" } = request.query;
      const where = itemWhere(request.query, prisma.item.fields.minQuantity);
      if (sort) {
        const sortable = (await prisma.item.findMany({ where, select: SORT_SELECT })).map(toSortable);
        const sorted = sortItems(sortable, { key: sort, dir: order });
        const ids = (pageSize ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted).map((row) => row.id);
        const rows = new Map(
          (await prisma.item.findMany({ where: { id: { in: ids } }, include: ITEM_INCLUDE })).map((row) => [row.id, row]),
        );
        return { items: ids.flatMap((id) => (rows.has(id) ? [toItem(rows.get(id)!, request.session)] : [])), total: sorted.length };
      }
      const [rows, total] = await prisma.$transaction([
        prisma.item.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: ITEM_INCLUDE,
          ...(pageSize && { skip: (page - 1) * pageSize, take: pageSize }),
        }),
        prisma.item.count({ where }),
      ]);
      return { items: rows.map((row) => toItem(row, request.session)), total };
    },
  );

  routes.post(
    "/items",
    { schema: { body: itemCreateSchema, response: { 201: itemSchema } } },
    async (request, reply) => {
      const change = await prisma.$transaction((tx) => createItem(tx, request.body));
      return change.ok ? reply.status(201).send(toItem(change.value, request.session)) : refuse(reply, change.rejection);
    },
  );

  routes.post(
    "/items/import",
    { schema: { body: itemImportSchema, response: { 200: itemImportResultSchema } } },
    async (request, reply) => {
      try {
        return await importItems(request.body.items);
      } catch (error) {
        if (error instanceof ImportConflict) {
          return importConflict(reply, error.message);
        }
        throw error;
      }
    },
  );

  routes.patch(
    "/items/:id",
    { schema: { params: itemIdParamsSchema, body: itemUpdateSchema, response: { 200: itemSchema } } },
    async (request, reply) => {
      const change = await prisma.$transaction((tx) => updateItem(tx, request.params.id, request.body));
      if (!change.ok) {
        return refuse(reply, change.rejection);
      }
      await removePhotoFiles(change.files);
      return toItem(change.value, request.session);
    },
  );

  routes.delete("/items/:id", { schema: { params: itemIdParamsSchema } }, async (request, reply) => {
    const change = await prisma.$transaction((tx) => deleteItem(tx, request.params.id));
    if (!change.ok) {
      return refuse(reply, change.rejection);
    }
    await removePhotoFiles(change.files);
    return reply.status(204).send();
  });
}
