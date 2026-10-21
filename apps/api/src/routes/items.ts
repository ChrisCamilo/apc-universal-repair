import type { FastifyInstance, FastifyReply } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import {
  codeKey,
  itemCreateSchema,
  itemIdParamsSchema,
  itemListQuerySchema,
  itemListResponseSchema,
  itemSchema,
  itemUpdateSchema,
  sortItems,
  type ItemBrandCreate,
} from "@apc/shared/items";
import { itemImportResultSchema, itemImportSchema } from "@apc/shared/item-csv";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../db/client.js";
import { importItems, ImportConflict } from "../items/import.js";
import {
  brandData,
  createData,
  ITEM_INCLUDE,
  itemWhere,
  originalCodesData,
  SORT_SELECT,
  syncQuantity,
  toItem,
  toSortable,
  updateData,
  type ListIds,
} from "../items/items.js";
import { listIds } from "../items/listIds.js";
import { removePhotoFiles } from "../photos/photos.js";

// CRUD of inventory items, each with the brands that make its part. The list shows the newest items first, or sorted
// by a column when asked, one page of them when a page size is asked, with how many items match in all. A sort
// compares text the way people read it in pt-BR (see sortItems), which the database can't, so it reads what the
// matching items sort by, sorts them here and then loads only the page asked. Saving an item adds the names its lists
// don't hold yet (see listIds), in the same transaction. A code, a brand's or an item's original one, is unique across
// the stock as the search compares it (see codeKey), so "CB4500" is "CB-4500": a code another item uses is rejected
// with 409, naming that item and the code, so the form can say which, and one used twice in the item with 400. An
// edit that sends original codes sends the whole new list. An edit that sends brands sends the whole new set: a brand
// with its id is kept and changed, one without is added, and one left out is deleted with its photos' files; an item
// keeps at least one. The item's quantity is its brands' sum. Deleting an item also deletes its photos' files. POST
// /items/import saves the items of a CSV file at once (see importItems).

/** A code sent, with the field of the request it came in, e.g. "brands/0/code" or "originalCodes/1". */
type SentCode = { code: string; field: string };
/**
 * Answers 400 for a code an item would hold twice, as an original code and a brand's.
 * @param reply Reply to send.
 * @param code The code.
 * @returns The sent reply.
 */
function codeRepeated(reply: FastifyReply, code: string) {
  return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: `Code "${code}" is repeated in the item.` });
}

/**
 * Answers 409 for a code another item already uses.
 * @param reply Reply to send.
 * @param taken The code that clashes, its field in the request and the item that uses it.
 * @returns The sent reply.
 */
function codeTaken(reply: FastifyReply, taken: SentCode & { owner: { id: string; name: string } }) {
  const message = `Code "${taken.code}" is already used by "${taken.owner.name}".`;
  return reply.status(409).send({
    statusCode: 409,
    error: "Conflict",
    message,
    details: [{ field: taken.field, message, code: taken.code, itemId: taken.owner.id, itemName: taken.owner.name }],
  });
}

/**
 * Finds the first code sent that another item uses, as a brand's code or an original one.
 * @param codes The codes sent, in the request's order.
 * @param itemId The item they belong to, which may keep its own codes.
 * @returns The code, its field and the item that uses it, or undefined when every code is free.
 */
async function findTakenCode(codes: readonly SentCode[], itemId?: string) {
  const sent = codes.map((each) => ({ ...each, code: each.code.trim().toUpperCase() }));
  const where = { codeKey: { in: sent.map((each) => codeKey(each.code)) }, ...(itemId && { itemId: { not: itemId } }) };
  const select = { codeKey: true, item: { select: { id: true, name: true } } };
  const held = [...(await prisma.itemBrand.findMany({ where, select })), ...(await prisma.itemOriginalCode.findMany({ where, select }))];
  const taken = sent.find((each) => held.some((row) => row.codeKey === codeKey(each.code)));
  return taken && { ...taken, owner: held.find((row) => row.codeKey === codeKey(taken.code))!.item };
}

/**
 * Answers 400 for a brand sent with the id of a brand that isn't the item's.
 * @param reply Reply to send.
 * @returns The sent reply.
 */
function foreignBrand(reply: FastifyReply) {
  return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "A brand sent with an id must be one of this item's." });
}

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
      const taken = await findTakenCode(sentCodes(request.body));
      if (taken) {
        return codeTaken(reply, taken);
      }
      const row = await prisma.$transaction(async (tx) => {
        const brands = [];
        for (const [position, brand] of request.body.brands.entries()) {
          brands.push(brandData(brand, (await listIds(tx, { partBrand: brand.partBrand })).partBrandId!, position));
        }
        const ids = (await listIds(tx, request.body)) as ListIds;
        return tx.item.create({
          data: {
            ...createData(request.body, ids),
            originalCodes: { create: originalCodesData(request.body.originalCodes ?? []) },
            brands: { create: brands },
          },
          include: ITEM_INCLUDE,
        });
      });
      return reply.status(201).send(toItem(row, request.session));
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
      const { id } = request.params;
      const held = await prisma.item.findUnique({
        where: { id },
        select: {
          vehicleBrandId: true,
          vehicleModel: { select: { name: true } },
          originalCodes: { select: { code: true } },
          brands: { select: { id: true, code: true, photos: true } },
        },
      });
      if (!held) {
        return notFound(reply);
      }
      const { brands, originalCodes } = request.body;
      const heldIds = held.brands.map((brand) => brand.id);
      if (brands?.some((brand) => brand.id && !heldIds.includes(brand.id))) {
        return foreignBrand(reply);
      }
      // The codes the item holds after the edit: the ones sent, or the ones it keeps.
      const repeated = repeatedCode([
        ...(brands ?? held.brands).map((brand) => brand.code),
        ...(originalCodes ?? held.originalCodes.map((original) => original.code)),
      ]);
      if (repeated) {
        return codeRepeated(reply, repeated);
      }
      const taken = await findTakenCode(sentCodes(request.body), id);
      if (taken) {
        return codeTaken(reply, taken);
      }
      const current = { vehicleBrandId: held.vehicleBrandId, vehicleModel: held.vehicleModel?.name ?? null };
      const row = await prisma.$transaction(async (tx) => {
        await tx.item.update({ where: { id }, data: updateData(request.body, await listIds(tx, request.body, current)) });
        if (originalCodes) {
          await tx.itemOriginalCode.deleteMany({ where: { itemId: id } });
          await tx.itemOriginalCode.createMany({ data: originalCodesData(originalCodes).map((data) => ({ ...data, itemId: id })) });
        }
        if (brands) {
          await saveBrands(tx, id, brands, heldIds);
        }
        return tx.item.findUniqueOrThrow({ where: { id }, include: ITEM_INCLUDE });
      });
      const kept = new Set(row.brands.map((brand) => brand.id));
      await removePhotoFiles(
        held.brands.filter((brand) => !kept.has(brand.id)).flatMap((brand) => brand.photos.flatMap((photo) => [photo.file, photo.thumbFile])),
      );
      return toItem(row, request.session);
    },
  );

  routes.delete("/items/:id", { schema: { params: itemIdParamsSchema } }, async (request, reply) => {
    const { id } = request.params;
    const photos = await prisma.itemPhoto.findMany({ where: { brand: { itemId: id } } });
    const { count } = await prisma.item.deleteMany({ where: { id } });
    if (count === 0) {
      return notFound(reply);
    }
    await removePhotoFiles(photos.flatMap((photo) => [photo.file, photo.thumbFile]));
    return reply.status(204).send();
  });
}

/**
 * Finds a code an item would hold twice, among its original codes and its brands' codes together.
 * @param codes Every code the item would hold.
 * @returns The first code repeated, or undefined.
 */
function repeatedCode(codes: readonly string[]): string | undefined {
  return codes.find((code, index) => codes.slice(0, index).some((other) => codeKey(other) === codeKey(code)));
}

/**
 * Saves an item's new set of brands: the ones left out are deleted, the ones with an id changed and the others added,
 * each at its place in the set, and the item's quantity becomes their sum.
 * @param tx Database client, in the edit's transaction.
 * @param itemId The item.
 * @param brands The whole new set, as sent.
 * @param heldIds The item's brands before the edit.
 */
async function saveBrands(tx: Prisma.TransactionClient, itemId: string, brands: readonly ItemBrandCreate[], heldIds: readonly string[]) {
  const kept = new Set(brands.flatMap((brand) => (brand.id ? [brand.id] : [])));
  await tx.itemBrand.deleteMany({ where: { itemId, id: { in: heldIds.filter((id) => !kept.has(id)) } } });
  for (const [position, brand] of brands.entries()) {
    const data = brandData(brand, (await listIds(tx, { partBrand: brand.partBrand })).partBrandId!, position);
    if (brand.id) {
      await tx.itemBrand.update({ where: { id: brand.id }, data });
    } else {
      await tx.itemBrand.create({ data: { ...data, itemId } });
    }
  }
  await syncQuantity(tx, itemId);
}

/**
 * Lists the codes of a request, with their fields: its brands' and its original ones.
 * @param body The create or edit body.
 * @returns Each code sent with its field.
 */
function sentCodes(body: { brands?: readonly { code: string }[]; originalCodes?: readonly string[] }): SentCode[] {
  return [
    ...(body.brands ?? []).map((brand, index) => ({ code: brand.code, field: `brands/${index}/code` })),
    ...(body.originalCodes ?? []).map((code, index) => ({ code, field: `originalCodes/${index}` })),
  ];
}
