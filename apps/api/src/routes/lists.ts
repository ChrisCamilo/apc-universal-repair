import type { FastifyInstance, FastifyReply } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { optionKey } from "@apc/shared/items";
import {
  ITEM_LIST_PATHS,
  listEntriesSchema,
  listEntryCreateSchema,
  listEntrySchema,
  listName,
  vehicleModelCreateSchema,
  vehicleModelSchema,
  vehicleModelsSchema,
  type ListEntry,
} from "@apc/shared/lists";
import { prisma } from "../db/client.js";

// The lists the item form picks from: categories, part brands, vehicle brands and vehicle models. GET sends a list
// sorted by name; POST creates a name with the writing rule applied, unless the list already holds it ignoring
// case, accents and extra spaces, and then sends back the one it holds (200) instead of a duplicate (201 for a new
// one). A vehicle model is created under its vehicle brand, and is only the same as a model of that brand.

/** The columns a list entry is sent with. */
const ENTRY = { id: true, name: true } as const;
/** The columns a vehicle model is read with. */
const MODEL = { id: true, name: true, brandId: true } as const;

/** How the routes reach one of the lists of plain names. */
type NameList = {
  all: () => Promise<ListEntry[]>;
  find: (nameKey: string) => Promise<ListEntry | null>;
  create: (name: string, nameKey: string) => Promise<ListEntry>;
};

/** The lists of plain names, by their key in ITEM_LIST_PATHS; vehicle brands are the Brand table. */
const NAME_LISTS: Record<"categories" | "partBrands" | "vehicleBrands", NameList> = {
  categories: {
    all: () => prisma.category.findMany({ select: ENTRY }),
    find: (nameKey) => prisma.category.findUnique({ where: { nameKey }, select: ENTRY }),
    create: (name, nameKey) => prisma.category.create({ data: { name, nameKey }, select: ENTRY }),
  },
  partBrands: {
    all: () => prisma.partBrand.findMany({ select: ENTRY }),
    find: (nameKey) => prisma.partBrand.findUnique({ where: { nameKey }, select: ENTRY }),
    create: (name, nameKey) => prisma.partBrand.create({ data: { name, nameKey }, select: ENTRY }),
  },
  vehicleBrands: {
    all: () => prisma.brand.findMany({ select: ENTRY }),
    find: (nameKey) => prisma.brand.findUnique({ where: { nameKey }, select: ENTRY }),
    create: (name, nameKey) => prisma.brand.create({ data: { name, nameKey }, select: ENTRY }),
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
 * Turns a vehicle model row into the model the API sends.
 * @param row Vehicle model row.
 * @returns The model with its vehicle brand's id.
 */
function toVehicleModel(row: { id: string; name: string; brandId: string }) {
  return { id: row.id, name: row.name, vehicleBrandId: row.brandId };
}

export function registerListRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  for (const [kind, list] of Object.entries(NAME_LISTS)) {
    const path = ITEM_LIST_PATHS[kind as keyof typeof NAME_LISTS];
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
  }

  routes.get(ITEM_LIST_PATHS.vehicleModels, { schema: { response: { 200: vehicleModelsSchema } } }, async () =>
    byName((await prisma.vehicleModel.findMany({ select: MODEL })).map(toVehicleModel)),
  );

  routes.post(
    ITEM_LIST_PATHS.vehicleModels,
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
}
