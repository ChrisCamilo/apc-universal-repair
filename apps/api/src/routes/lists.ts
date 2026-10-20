import type { FastifyInstance, FastifyReply } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { optionKey } from "@apc/shared/items";
import {
  isCatalogBrand,
  ITEM_LIST_PATHS,
  listEntriesSchema,
  listEntryCreateSchema,
  listEntryIdParamsSchema,
  listEntryMergedSchema,
  listEntryMergeSchema,
  listEntrySchema,
  listName,
  vehicleModelCreateSchema,
  vehicleModelSchema,
  vehicleModelsSchema,
  type ItemListKind,
  type ListEntry,
} from "@apc/shared/lists";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../db/client.js";

// The lists the item form picks from: categories, part brands, vehicle brands and vehicle models. GET sends a list
// sorted by name; POST creates a name with the writing rule applied, unless the list already holds it ignoring
// case, accents and extra spaces, and then sends back the one it holds (200) instead of a duplicate (201 for a new
// one). A vehicle model is created under its vehicle brand, and is only the same as a model of that brand.
// PATCH renames an entry, with the same rule, refusing a name another entry has (409, naming that entry, so the screen
// can offer to merge them); the items that use it refer to it, so they show the new name. POST .../:id/merge merges an
// entry into another of its list (a model into one of its brand) in one transaction: its items move there and it is
// deleted, a vehicle brand's models moving along, those of a name the other brand has joining that model; it answers
// how many items moved, and refuses a merge into itself, away from a catalog vehicle brand, or of two part brands
// an item has both of (409). DELETE removes an entry no item uses, a vehicle brand with its models; an entry items
// use is refused naming how many (409), and so is a vehicle brand of the catalog. A part brand is used by the items
// it makes a brand of.

/** The columns a list entry is sent with. */
const ENTRY = { id: true, name: true } as const;
/** The items using an entry of each list: by their own column, or a part brand through any of their brands. */
const ITEMS_USING: Record<ItemListKind, (id: string) => Prisma.ItemWhereInput> = {
  categories: (id) => ({ categoryId: id }),
  partBrands: (id) => ({ brands: { some: { partBrandId: id } } }),
  vehicleBrands: (id) => ({ vehicleBrandId: id }),
  vehicleModels: (id) => ({ vehicleModelId: id }),
};
/** The columns a vehicle model is read with. */
const MODEL = { id: true, name: true, brandId: true } as const;

/** How the routes reach one of the lists of plain names. */
type NameList = {
  all: () => Promise<ListEntry[]>;
  byId: (id: string) => Promise<ListEntry | null>;
  find: (nameKey: string) => Promise<ListEntry | null>;
  create: (name: string, nameKey: string) => Promise<ListEntry>;
  rename: (id: string, name: string, nameKey: string) => Prisma.PrismaPromise<ListEntry>;
  remove: (id: string) => Promise<unknown>;
};

/** The lists of plain names, by their key in ITEM_LIST_PATHS; vehicle brands are the Brand table. */
const NAME_LISTS: Record<"categories" | "partBrands" | "vehicleBrands", NameList> = {
  categories: {
    all: () => prisma.category.findMany({ select: ENTRY }),
    byId: (id) => prisma.category.findUnique({ where: { id }, select: ENTRY }),
    find: (nameKey) => prisma.category.findUnique({ where: { nameKey }, select: ENTRY }),
    create: (name, nameKey) => prisma.category.create({ data: { name, nameKey }, select: ENTRY }),
    rename: (id, name, nameKey) => prisma.category.update({ where: { id }, data: { name, nameKey }, select: ENTRY }),
    remove: (id) => prisma.category.delete({ where: { id } }),
  },
  partBrands: {
    all: () => prisma.partBrand.findMany({ select: ENTRY }),
    byId: (id) => prisma.partBrand.findUnique({ where: { id }, select: ENTRY }),
    find: (nameKey) => prisma.partBrand.findUnique({ where: { nameKey }, select: ENTRY }),
    create: (name, nameKey) => prisma.partBrand.create({ data: { name, nameKey }, select: ENTRY }),
    rename: (id, name, nameKey) => prisma.partBrand.update({ where: { id }, data: { name, nameKey }, select: ENTRY }),
    remove: (id) => prisma.partBrand.delete({ where: { id } }),
  },
  vehicleBrands: {
    all: () => prisma.brand.findMany({ select: ENTRY }),
    byId: (id) => prisma.brand.findUnique({ where: { id }, select: ENTRY }),
    find: (nameKey) => prisma.brand.findUnique({ where: { nameKey }, select: ENTRY }),
    create: (name, nameKey) => prisma.brand.create({ data: { name, nameKey }, select: ENTRY }),
    rename: (id, name, nameKey) => prisma.brand.update({ where: { id }, data: { name, nameKey }, select: ENTRY }),
    // Its models go with it (onDelete: Cascade).
    remove: (id) => prisma.brand.delete({ where: { id } }),
  },
};

/**
 * Answers 404 for a vehicle brand id that doesn't exist.
 * @param reply Reply to send.
 * @returns The sent reply.
 */
function brandNotFound(reply: FastifyReply) {
  return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Vehicle brand not found." });
}

/**
 * Sorts a list by name the way the form shows it, accents in their alphabetical place.
 * @param entries Entries in any order.
 * @returns The entries sorted by name.
 */
function byName<Entry extends ListEntry>(entries: Entry[]): Entry[] {
  return entries.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/**
 * Answers 409 for a change the list can't take.
 * @param reply Reply to send.
 * @param message What keeps it from being done.
 * @param reason How many items use the entry, or the entry that has the name, when that is the reason.
 * @returns The sent reply.
 */
function conflict(reply: FastifyReply, message: string, reason: { itemCount?: number; entryId?: string } = {}) {
  return reply.status(409).send({ statusCode: 409, error: "Conflict", message, details: [{ field: "id", message, ...reason }] });
}

/**
 * Answers 404 for a list entry id that doesn't exist.
 * @param reply Reply to send.
 * @returns The sent reply.
 */
function entryNotFound(reply: FastifyReply) {
  return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "List entry not found." });
}

/**
 * Merges an entry into another of its list in one transaction: the items using it move there and it is deleted. A
 * vehicle brand's models move to the other brand, and one whose name that brand already has joins its model instead.
 * @param kind The list.
 * @param id The entry merged away.
 * @param into The entry it is merged into.
 * @returns How many items moved.
 */
function mergeEntries(kind: ItemListKind, id: string, into: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    if (kind === "categories") {
      const { count } = await tx.item.updateMany({ where: { categoryId: id }, data: { categoryId: into } });
      await tx.category.delete({ where: { id } });
      return count;
    }
    if (kind === "partBrands") {
      const { count } = await tx.itemBrand.updateMany({ where: { partBrandId: id }, data: { partBrandId: into } });
      await tx.partBrand.delete({ where: { id } });
      return count;
    }
    if (kind === "vehicleModels") {
      const { count } = await tx.item.updateMany({ where: { vehicleModelId: id }, data: { vehicleModelId: into } });
      await tx.vehicleModel.delete({ where: { id } });
      return count;
    }
    for (const model of await tx.vehicleModel.findMany({ where: { brandId: id }, select: { id: true, nameKey: true } })) {
      const twin = await tx.vehicleModel.findUnique({
        where: { brandId_nameKey: { brandId: into, nameKey: model.nameKey } },
        select: { id: true },
      });
      if (twin) {
        await tx.item.updateMany({ where: { vehicleModelId: model.id }, data: { vehicleModelId: twin.id } });
        await tx.vehicleModel.delete({ where: { id: model.id } });
      } else {
        await tx.vehicleModel.update({ where: { id: model.id }, data: { brandId: into } });
      }
    }
    const { count } = await tx.item.updateMany({ where: { vehicleBrandId: id }, data: { vehicleBrandId: into } });
    await tx.brand.delete({ where: { id } });
    return count;
  });
}

/**
 * Turns a vehicle model row into the model the API sends.
 * @param row Vehicle model row.
 * @returns The model with its vehicle brand's id.
 */
function toVehicleModel(row: { id: string; name: string; brandId: string }) {
  return { id: row.id, name: row.name, vehicleBrandId: row.brandId };
}

export function registerListRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  for (const [listKind, list] of Object.entries(NAME_LISTS)) {
    const kind = listKind as keyof typeof NAME_LISTS;
    const path = ITEM_LIST_PATHS[kind];
    routes.get(path, { schema: { response: { 200: listEntriesSchema } } }, async () => byName(await list.all()));

    routes.post(
      path,
      { schema: { body: listEntryCreateSchema, response: { 200: listEntrySchema, 201: listEntrySchema } } },
      async (request, reply) => {
        const name = listName(request.body.name);
        const nameKey = optionKey(name);
        return (await list.find(nameKey)) ?? reply.status(201).send(await list.create(name, nameKey));
      },
    );

    routes.patch(
      `${path}/:id`,
      { schema: { params: listEntryIdParamsSchema, body: listEntryCreateSchema, response: { 200: listEntrySchema } } },
      async (request, reply) => {
        const { id } = request.params;
        const held = await list.byId(id);
        if (!held) {
          return entryNotFound(reply);
        }
        const name = listName(request.body.name);
        const nameKey = optionKey(name);
        const other = await list.find(nameKey);
        if (other && other.id !== id) {
          return conflict(reply, `"${other.name}" is already in the list.`, { entryId: other.id });
        }
        return list.rename(id, name, nameKey);
      },
    );

    routes.post(
      `${path}/:id/merge`,
      { schema: { params: listEntryIdParamsSchema, body: listEntryMergeSchema, response: { 200: listEntryMergedSchema } } },
      async (request, reply) => {
        const { id } = request.params;
        const { into } = request.body;
        const [held, kept] = await Promise.all([list.byId(id), list.byId(into)]);
        if (!held || !kept) {
          return entryNotFound(reply);
        }
        if (id === into) {
          return conflict(reply, "An entry can't be merged into itself.");
        }
        if (kind === "vehicleBrands" && isCatalogBrand(held.name)) {
          return conflict(reply, `"${held.name}" is a catalog brand.`);
        }
        // A part brand makes an item once: an item with both brands would hold the same part brand twice.
        const both = kind === "partBrands" ? await prisma.item.count({ where: { AND: [ITEMS_USING.partBrands(id), ITEMS_USING.partBrands(into)] } }) : 0;
        if (both > 0) {
          return conflict(reply, `${both} items have both "${held.name}" and "${kept.name}".`, { itemCount: both });
        }
        return { moved: await mergeEntries(kind, id, into) };
      },
    );

    routes.delete(`${path}/:id`, { schema: { params: listEntryIdParamsSchema } }, async (request, reply) => {
      const { id } = request.params;
      const held = await list.byId(id);
      if (!held) {
        return entryNotFound(reply);
      }
      if (kind === "vehicleBrands" && isCatalogBrand(held.name)) {
        return conflict(reply, `"${held.name}" is a catalog brand.`);
      }
      const itemCount = await prisma.item.count({ where: ITEMS_USING[kind](id) });
      if (itemCount > 0) {
        return conflict(reply, `"${held.name}" is used by ${itemCount} items.`, { itemCount });
      }
      await list.remove(id);
      return reply.status(204).send();
    });
  }

  const modelsPath = ITEM_LIST_PATHS.vehicleModels;

  routes.get(modelsPath, { schema: { response: { 200: vehicleModelsSchema } } }, async () =>
    byName((await prisma.vehicleModel.findMany({ select: MODEL })).map(toVehicleModel)),
  );

  routes.post(
    modelsPath,
    { schema: { body: vehicleModelCreateSchema, response: { 200: vehicleModelSchema, 201: vehicleModelSchema } } },
    async (request, reply) => {
      const brandId = request.body.vehicleBrandId;
      if (!(await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } }))) {
        return brandNotFound(reply);
      }
      const name = listName(request.body.name);
      const nameKey = optionKey(name);
      const held = await prisma.vehicleModel.findUnique({ where: { brandId_nameKey: { brandId, nameKey } }, select: MODEL });
      if (held) {
        return toVehicleModel(held);
      }
      const created = await prisma.vehicleModel.create({ data: { name, nameKey, brandId }, select: MODEL });
      return reply.status(201).send(toVehicleModel(created));
    },
  );

  routes.patch(
    `${modelsPath}/:id`,
    { schema: { params: listEntryIdParamsSchema, body: listEntryCreateSchema, response: { 200: vehicleModelSchema } } },
    async (request, reply) => {
      const { id } = request.params;
      const held = await prisma.vehicleModel.findUnique({ where: { id }, select: MODEL });
      if (!held) {
        return entryNotFound(reply);
      }
      const name = listName(request.body.name);
      const nameKey = optionKey(name);
      const other = await prisma.vehicleModel.findUnique({
        where: { brandId_nameKey: { brandId: held.brandId, nameKey } },
        select: MODEL,
      });
      if (other && other.id !== id) {
        return conflict(reply, `"${other.name}" is already a model of this brand.`, { entryId: other.id });
      }
      const renamed = await prisma.vehicleModel.update({ where: { id }, data: { name, nameKey }, select: MODEL });
      return toVehicleModel(renamed);
    },
  );

  routes.post(
    `${modelsPath}/:id/merge`,
    { schema: { params: listEntryIdParamsSchema, body: listEntryMergeSchema, response: { 200: listEntryMergedSchema } } },
    async (request, reply) => {
      const { id } = request.params;
      const { into } = request.body;
      const [held, kept] = await Promise.all([
        prisma.vehicleModel.findUnique({ where: { id }, select: MODEL }),
        prisma.vehicleModel.findUnique({ where: { id: into }, select: MODEL }),
      ]);
      if (!held || !kept) {
        return entryNotFound(reply);
      }
      if (id === into) {
        return conflict(reply, "An entry can't be merged into itself.");
      }
      if (held.brandId !== kept.brandId) {
        return conflict(reply, "A model can only be merged into a model of its brand.");
      }
      return { moved: await mergeEntries("vehicleModels", id, into) };
    },
  );

  routes.delete(`${modelsPath}/:id`, { schema: { params: listEntryIdParamsSchema } }, async (request, reply) => {
    const { id } = request.params;
    const held = await prisma.vehicleModel.findUnique({ where: { id }, select: MODEL });
    if (!held) {
      return entryNotFound(reply);
    }
    const itemCount = await prisma.item.count({ where: ITEMS_USING.vehicleModels(id) });
    if (itemCount > 0) {
      return conflict(reply, `"${held.name}" is used by ${itemCount} items.`, { itemCount });
    }
    await prisma.vehicleModel.delete({ where: { id } });
    return reply.status(204).send();
  });
}
