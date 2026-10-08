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
import { prisma } from "../db/client.js";
import { createData, itemWhere, toItem, updateData, WITH_PHOTOS } from "../items/items.js";
import { removePhotoFiles } from "../photos/photos.js";

// CRUD of inventory items. The list shows the newest items first, or sorted by a column when asked, one page of them
// when a page size is asked, with how many items match in all. A sort compares text the way people read it in
// pt-BR (see sortItems), which the database can't, so it reads what the matching items sort by, sorts them here and
// then loads only the page asked. A part code is unique: creating or editing to a code another item uses is rejected
// with 409, naming that item, so the form can say which.
// Deleting an item also deletes its photos' files.

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

/** The columns sortItems looks at, read for every matching item before a sorted page is loaded. */
const SORT_SELECT = {
  id: true,
  code: true,
  name: true,
  category: true,
  partBrand: true,
  vehicleBrand: true,
  vehicleModel: true,
  position: true,
  side: true,
  color: true,
  location: true,
  unitPriceCents: true,
  quantity: true,
} as const;

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
        const sorted = sortItems(await prisma.item.findMany({ where, select: SORT_SELECT }), { key: sort, dir: order });
        const ids = (pageSize ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted).map((row) => row.id);
        const rows = new Map(
          (await prisma.item.findMany({ where: { id: { in: ids } }, include: WITH_PHOTOS })).map((row) => [row.id, row]),
        );
        return { items: ids.flatMap((id) => (rows.has(id) ? [toItem(rows.get(id)!)] : [])), total: sorted.length };
      }
      const [rows, total] = await prisma.$transaction([
        prisma.item.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: WITH_PHOTOS,
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
      const data = createData(request.body);
      const owner = await prisma.item.findUnique({ where: { code: data.code }, select: { id: true, name: true } });
      if (owner) {
        return codeTaken(reply, data.code, owner);
      }
      const row = await prisma.item.create({ data, include: WITH_PHOTOS });
      return reply.status(201).send(toItem(row));
    },
  );

  routes.patch(
    "/items/:id",
    { schema: { params: itemIdParamsSchema, body: itemUpdateSchema, response: { 200: itemSchema } } },
    async (request, reply) => {
      const { id } = request.params;
      if (!(await prisma.item.findUnique({ where: { id }, select: { id: true } }))) {
        return notFound(reply);
      }
      const data = updateData(request.body);
      if (typeof data.code === "string") {
        const owner = await prisma.item.findUnique({ where: { code: data.code }, select: { id: true, name: true } });
        if (owner && owner.id !== id) {
          return codeTaken(reply, data.code, owner);
        }
      }
      return toItem(await prisma.item.update({ where: { id }, data, include: WITH_PHOTOS }));
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
