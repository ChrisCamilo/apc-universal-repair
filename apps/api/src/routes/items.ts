import type { FastifyInstance, FastifyReply } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import {
  itemCreateSchema,
  itemIdParamsSchema,
  itemListQuerySchema,
  itemListResponseSchema,
  itemSchema,
  itemUpdateSchema,
} from "@apc/shared/items";
import { prisma } from "../db/client.js";
import { createData, itemWhere, toItem, updateData } from "../items/items.js";

// CRUD of inventory items. The list keeps the order the items were added in. A part code is unique: creating
// or editing to a code another item uses is rejected with 409, naming that item, so the form can say which.

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
function notFound(reply: FastifyReply) {
  return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Item not found." });
}

export function registerItemRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/items",
    { schema: { querystring: itemListQuerySchema, response: { 200: itemListResponseSchema } } },
    async (request) => {
      const rows = await prisma.item.findMany({
        where: itemWhere(request.query, prisma.item.fields.minQuantity),
        orderBy: { createdAt: "asc" },
      });
      return { items: rows.map(toItem) };
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
      const row = await prisma.item.create({ data });
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
      return toItem(await prisma.item.update({ where: { id }, data }));
    },
  );

  routes.delete("/items/:id", { schema: { params: itemIdParamsSchema } }, async (request, reply) => {
    const { count } = await prisma.item.deleteMany({ where: { id: request.params.id } });
    return count === 0 ? notFound(reply) : reply.status(204).send();
  });
}
