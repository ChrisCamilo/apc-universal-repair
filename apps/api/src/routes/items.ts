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
} from "@apc/shared/items";
import { itemImportResultSchema, itemImportSchema } from "@apc/shared/item-csv";
import { prisma } from "../db/client.js";
import { importItems } from "../items/import.js";
import { createData, ITEM_INCLUDE, itemWhere, SORT_SELECT, toItem, toSortable, updateData, type ListIds } from "../items/items.js";
import { listIds } from "../items/listIds.js";
import { removePhotoFiles } from "../photos/photos.js";

// CRUD of inventory items. The list shows the newest items first, or sorted by a column when asked, one page of them
// when a page size is asked, with how many items match in all. A sort compares text the way people read it in
// pt-BR (see sortItems), which the database can't, so it reads what the matching items sort by, sorts them here and
// then loads only the page asked. Saving an item adds the names its lists don't hold yet (see listIds), in the same
// transaction. A part code is unique: creating or editing to a code another item uses is rejected with 409, naming
// that item, so the form can say which. Deleting an item also deletes its photos' files. POST /items/import saves the
// items of a CSV file at once (see importItems).

/**
 * Answers 409 for a part code another item already uses.
 * @param reply Reply to send.
 * @param code The code that clashes.
 * @param owner The item that uses it.
 * @returns The sent reply.
 */
function codeTaken(reply: FastifyReply, code: string, owner: { id: string; name: string }) {
  const message = `Code "${code}" is already used by "${owner.name}".`;
  return reply.status(409).send({
    statusCode: 409,
    error: "Conflict",
    message,
    details: [{ field: "code", message, itemId: owner.id, itemName: owner.name }],
  });
}

/**
 * Answers 404 for an item id that doesn't exist.
 * @param reply Reply to send.
 * @returns The sent reply.
 */
export function notFound(reply: FastifyReply) {
  return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Item not found." });
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
        return { items: ids.flatMap((id) => (rows.has(id) ? [toItem(rows.get(id)!)] : [])), total: sorted.length };
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
      return { items: rows.map(toItem), total };
    },
  );

  routes.post(
    "/items",
    { schema: { body: itemCreateSchema, response: { 201: itemSchema } } },
    async (request, reply) => {
      const code = request.body.code.trim().toUpperCase();
      const owner = await prisma.item.findUnique({ where: { code }, select: { id: true, name: true } });
      if (owner) {
        return codeTaken(reply, code, owner);
      }
      const row = await prisma.$transaction(async (tx) =>
        tx.item.create({ data: createData(request.body, (await listIds(tx, request.body)) as ListIds), include: ITEM_INCLUDE }),
      );
      return reply.status(201).send(toItem(row));
    },
  );

  routes.post(
    "/items/import",
    { schema: { body: itemImportSchema, response: { 200: itemImportResultSchema } } },
    async (request) => importItems(request.body.items),
  );

  routes.patch(
    "/items/:id",
    { schema: { params: itemIdParamsSchema, body: itemUpdateSchema, response: { 200: itemSchema } } },
    async (request, reply) => {
      const { id } = request.params;
      const held = await prisma.item.findUnique({ where: { id }, select: { vehicleBrandId: true, vehicleModel: { select: { name: true } } } });
      if (!held) {
        return notFound(reply);
      }
      const code = request.body.code?.trim().toUpperCase();
      if (code !== undefined) {
        const owner = await prisma.item.findUnique({ where: { code }, select: { id: true, name: true } });
        if (owner && owner.id !== id) {
          return codeTaken(reply, code, owner);
        }
      }
      const current = { vehicleBrandId: held.vehicleBrandId, vehicleModel: held.vehicleModel?.name ?? null };
      const row = await prisma.$transaction(async (tx) =>
        tx.item.update({ where: { id }, data: updateData(request.body, await listIds(tx, request.body, current)), include: ITEM_INCLUDE }),
      );
      return toItem(row);
    },
  );

  routes.delete("/items/:id", { schema: { params: itemIdParamsSchema } }, async (request, reply) => {
    const { id } = request.params;
    const photos = await prisma.itemPhoto.findMany({ where: { itemId: id } });
    const { count } = await prisma.item.deleteMany({ where: { id } });
    if (count === 0) {
      return notFound(reply);
    }
    await removePhotoFiles(photos.flatMap((photo) => [photo.file, photo.thumbFile]));
    return reply.status(204).send();
  });
}
