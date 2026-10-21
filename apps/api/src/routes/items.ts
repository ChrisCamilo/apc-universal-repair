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
// don't hold yet (see listIds), in the same transaction. A part code is unique across every brand of the stock as the
// search compares it (see codeKey), so "CB4500" is "CB-4500": a code another item's brand uses is rejected with 409,
// naming that item and the code, so the form can say which. An edit that sends brands sends the whole new set: a brand
// with its id is kept and changed, one without is added, and one left out is deleted with its photos' files; an item
// keeps at least one. The item's quantity is its brands' sum. Deleting an item also deletes its photos' files. POST
// /items/import saves the items of a CSV file at once (see importItems).

/**
 * Answers 409 for a part code another item's brand already uses.
 * @param reply Reply to send.
 * @param taken The code that clashes, the place of its brand in the request and the item that uses it.
 * @returns The sent reply.
 */
function codeTaken(reply: FastifyReply, taken: { code: string; index: number; owner: { id: string; name: string } }) {
  const message = `Code "${taken.code}" is already used by "${taken.owner.name}".`;
  return reply.status(409).send({
    statusCode: 409,
    error: "Conflict",
    message,
    details: [{ field: `brands/${taken.index}/code`, message, code: taken.code, itemId: taken.owner.id, itemName: taken.owner.name }],
  });
}

/**
 * Finds the first code of some brands that a brand of another item uses.
 * @param brands The brands sent.
 * @param itemId The item they belong to, whose own brands may keep their codes.
 * @returns The code, its brand's place and the item that uses it, or undefined when every code is free.
 */
async function findTakenCode(brands: readonly ItemBrandCreate[], itemId?: string) {
  const codes = brands.map((brand) => brand.code.trim().toUpperCase());
  const held = await prisma.itemBrand.findMany({
    where: { codeKey: { in: codes.map(codeKey) }, ...(itemId && { itemId: { not: itemId } }) },
    select: { codeKey: true, item: { select: { id: true, name: true } } },
  });
  const index = codes.findIndex((code) => held.some((row) => row.codeKey === codeKey(code)));
  return index < 0 ? undefined : { code: codes[index], index, owner: held.find((row) => row.codeKey === codeKey(codes[index]))!.item };
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
      const taken = await findTakenCode(request.body.brands);
      if (taken) {
        return codeTaken(reply, taken);
      }
      const row = await prisma.$transaction(async (tx) => {
        const brands = [];
        for (const [position, brand] of request.body.brands.entries()) {
          brands.push(brandData(brand, (await listIds(tx, { partBrand: brand.partBrand })).partBrandId!, position));
        }
        const ids = (await listIds(tx, request.body)) as ListIds;
        return tx.item.create({ data: { ...createData(request.body, ids), brands: { create: brands } }, include: ITEM_INCLUDE });
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
        select: { vehicleBrandId: true, vehicleModel: { select: { name: true } }, brands: { select: { id: true, photos: true } } },
      });
      if (!held) {
        return notFound(reply);
      }
      const { brands } = request.body;
      const heldIds = held.brands.map((brand) => brand.id);
      if (brands?.some((brand) => brand.id && !heldIds.includes(brand.id))) {
        return foreignBrand(reply);
      }
      const taken = brands && (await findTakenCode(brands, id));
      if (taken) {
        return codeTaken(reply, taken);
      }
      const current = { vehicleBrandId: held.vehicleBrandId, vehicleModel: held.vehicleModel?.name ?? null };
      const row = await prisma.$transaction(async (tx) => {
        await tx.item.update({ where: { id }, data: updateData(request.body, await listIds(tx, request.body, current)) });
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
