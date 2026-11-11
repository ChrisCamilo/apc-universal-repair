import type { FastifyInstance, FastifyReply } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import {
  brandMark,
  CATALOG_BRANDS_PATH,
  CATALOG_LEVEL_PATHS,
  CATALOG_PATH,
  catalogGenerationInputSchema,
  catalogIdParamsSchema,
  catalogMoveSchema,
  catalogNameSchema,
  catalogSchema,
  catalogYearInputSchema,
  type CatalogData,
  type CatalogEditLevel,
} from "@apc/domain/catalog";
import { optionKey } from "@apc/domain/items";
import { listName } from "@apc/domain/lists";
import { prisma } from "../../db/client.js";

// The vehicle catalog of the Catalog tab (see @apc/domain/catalog). GET sends every catalog brand in the rail's order,
// by its vehicle brand's id and name, each with its models by their vehicle model's name, and under them the
// generations, versions, years and engines with their sheets, each level in its order.
// The tree is edited here, and every change answers the whole catalog (201 for something added). A brand is added by
// name: the vehicle brand of that name, added to the lists when they don't hold it, becomes a catalog brand at the end of
// the rail, refused when it is one already (409). A model is added under a catalog brand the same way, from its
// vehicle models, refused when the brand has it in the catalog already. A generation (with its years), a version and a
// year are added at the end of their parent's; a version can't have one year twice (409). Each of these is renamed (a
// model by renaming its vehicle model, refused when another model of the brand has the name), moved up or down among
// its siblings (past the ends it stays put), and deleted with everything under it; a model's vehicle model stays in the
// lists. A node or parent that isn't there answers 404.

/** Orders a level of the catalog by its place among its siblings. */
const IN_ORDER = { orderBy: { position: "asc" } } as const;
/** Orders siblings by their place, and those that share one by id, so a move always finds the same order. */
const SIBLING_ORDER = { orderBy: [{ position: "asc" as const }, { id: "asc" as const }] };

/**
 * Answers 409 for a name or year another node has, or a brand or model the catalog has already.
 * @param reply Reply to send.
 * @param message What clashes.
 * @returns The sent reply.
 */
function conflict(reply: FastifyReply, message: string) {
  return reply.status(409).send({ statusCode: 409, error: "Conflict", message });
}

/**
 * Finds the next place at the end of some siblings.
 * @param last The last sibling's place, if any.
 * @returns The place after it, or 0 for the first.
 */
function nextPosition(last: { _max: { position: number | null } }): number {
  return (last._max.position ?? -1) + 1;
}

/**
 * Answers 404 for a node, or a parent to add under, that isn't there.
 * @param reply Reply to send.
 * @returns The sent reply.
 */
function notFound(reply: FastifyReply) {
  return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Catalog node not found." });
}

/**
 * Reads the whole catalog as the API sends it.
 * @returns The catalog brands in the rail's order, with their trees.
 */
async function readCatalog(): Promise<CatalogData> {
  const [brands, models] = await Promise.all([
    prisma.catalogBrand.findMany({ ...IN_ORDER, select: { mark: true, brand: { select: { id: true, name: true } } } }),
    prisma.catalogModel.findMany({
      ...IN_ORDER,
      select: {
        id: true,
        vehicleModel: { select: { name: true, brandId: true } },
        generations: {
          ...IN_ORDER,
          select: {
            id: true,
            name: true,
            firstYear: true,
            lastYear: true,
            versions: {
              ...IN_ORDER,
              select: {
                id: true,
                name: true,
                years: {
                  ...IN_ORDER,
                  select: {
                    id: true,
                    year: true,
                    engines: { ...IN_ORDER, select: { id: true, displacementDl: true, cylinders: true, drive: true, summary: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);
  return {
    brands: brands.map(({ mark, brand }) => ({
      id: brand.id,
      name: brand.name,
      mark,
      models: models
        .filter((model) => model.vehicleModel.brandId === brand.id)
        .map(({ id, vehicleModel, generations }) => ({ id, name: vehicleModel.name, generations })),
    })),
  };
}

/**
 * Deletes a node of a level, and everything under it.
 * @param level The node's level.
 * @param id The node.
 */
async function removeNode(level: CatalogEditLevel, id: string): Promise<void> {
  const where = { where: { id } };
  switch (level) {
    case "model":
      await prisma.catalogModel.delete(where);
      return;
    case "generation":
      await prisma.catalogGeneration.delete(where);
      return;
    case "version":
      await prisma.catalogVersion.delete(where);
      return;
    case "year":
      await prisma.catalogYear.delete(where);
  }
}

/**
 * Writes the places of some siblings in their new order, in one transaction.
 * @param level Their level.
 * @param ids Their ids, in order.
 */
async function reorder(level: CatalogEditLevel, ids: readonly string[]): Promise<void> {
  await prisma.$transaction(
    ids.map((id, position) => {
      const update = { where: { id }, data: { position } };
      switch (level) {
        case "model":
          return prisma.catalogModel.update(update);
        case "generation":
          return prisma.catalogGeneration.update(update);
        case "version":
          return prisma.catalogVersion.update(update);
        case "year":
          return prisma.catalogYear.update(update);
      }
    }),
  );
}

/**
 * Lists a node's siblings, itself included, in their order.
 * @param level The node's level.
 * @param id The node.
 * @returns Their ids, or null when the node isn't there.
 */
async function siblingsOf(level: CatalogEditLevel, id: string): Promise<string[] | null> {
  const ids = (rows: { id: string }[]) => rows.map((row) => row.id);
  const select = { ...SIBLING_ORDER, select: { id: true } };
  switch (level) {
    case "model": {
      const node = await prisma.catalogModel.findUnique({ where: { id }, select: { vehicleModel: { select: { brandId: true } } } });
      return node && ids(await prisma.catalogModel.findMany({ where: { vehicleModel: { brandId: node.vehicleModel.brandId } }, ...select }));
    }
    case "generation": {
      const node = await prisma.catalogGeneration.findUnique({ where: { id }, select: { modelId: true } });
      return node && ids(await prisma.catalogGeneration.findMany({ where: { modelId: node.modelId }, ...select }));
    }
    case "version": {
      const node = await prisma.catalogVersion.findUnique({ where: { id }, select: { generationId: true } });
      return node && ids(await prisma.catalogVersion.findMany({ where: { generationId: node.generationId }, ...select }));
    }
    case "year": {
      const node = await prisma.catalogYear.findUnique({ where: { id }, select: { versionId: true } });
      return node && ids(await prisma.catalogYear.findMany({ where: { versionId: node.versionId }, ...select }));
    }
  }
}

export function registerCatalogRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();
  const params = catalogIdParamsSchema;
  const changed = { 200: catalogSchema };
  const added = { 201: catalogSchema };

  routes.get(CATALOG_PATH, { schema: { response: changed } }, () => readCatalog());

  routes.post(CATALOG_BRANDS_PATH, { schema: { body: catalogNameSchema, response: added } }, async (request, reply) => {
    const name = listName(request.body.name);
    const nameKey = optionKey(name);
    const brand =
      (await prisma.brand.findUnique({ where: { nameKey }, select: { id: true, name: true, catalog: { select: { id: true } } } })) ??
      (await prisma.brand.create({ data: { name, nameKey }, select: { id: true, name: true, catalog: { select: { id: true } } } }));
    if (brand.catalog) {
      return conflict(reply, `"${brand.name}" is in the catalog already.`);
    }
    const position = nextPosition(await prisma.catalogBrand.aggregate({ _max: { position: true } }));
    await prisma.catalogBrand.create({ data: { brandId: brand.id, mark: brandMark(brand.name), position } });
    return reply.status(201).send(await readCatalog());
  });

  routes.post(
    `${CATALOG_BRANDS_PATH}/:id/models`,
    { schema: { params, body: catalogNameSchema, response: added } },
    async (request, reply) => {
      const brandId = request.params.id;
      if (!(await prisma.catalogBrand.findUnique({ where: { brandId }, select: { id: true } }))) {
        return notFound(reply);
      }
      const name = listName(request.body.name);
      const nameKey = optionKey(name);
      const select = { id: true, name: true, catalogModel: { select: { id: true } } };
      const vehicleModel =
        (await prisma.vehicleModel.findUnique({ where: { brandId_nameKey: { brandId, nameKey } }, select })) ??
        (await prisma.vehicleModel.create({ data: { name, nameKey, brandId }, select }));
      if (vehicleModel.catalogModel) {
        return conflict(reply, `"${vehicleModel.name}" is in the catalog already.`);
      }
      const position = nextPosition(await prisma.catalogModel.aggregate({ where: { vehicleModel: { brandId } }, _max: { position: true } }));
      await prisma.catalogModel.create({ data: { vehicleModelId: vehicleModel.id, position } });
      return reply.status(201).send(await readCatalog());
    },
  );

  routes.post(
    `${CATALOG_LEVEL_PATHS.model}/:id/generations`,
    { schema: { params, body: catalogGenerationInputSchema, response: added } },
    async (request, reply) => {
      const modelId = request.params.id;
      if (!(await prisma.catalogModel.findUnique({ where: { id: modelId }, select: { id: true } }))) {
        return notFound(reply);
      }
      const { name, firstYear, lastYear } = request.body;
      const position = nextPosition(await prisma.catalogGeneration.aggregate({ where: { modelId }, _max: { position: true } }));
      await prisma.catalogGeneration.create({ data: { modelId, position, name: listName(name), firstYear, lastYear } });
      return reply.status(201).send(await readCatalog());
    },
  );

  routes.post(
    `${CATALOG_LEVEL_PATHS.generation}/:id/versions`,
    { schema: { params, body: catalogNameSchema, response: added } },
    async (request, reply) => {
      const generationId = request.params.id;
      if (!(await prisma.catalogGeneration.findUnique({ where: { id: generationId }, select: { id: true } }))) {
        return notFound(reply);
      }
      const position = nextPosition(await prisma.catalogVersion.aggregate({ where: { generationId }, _max: { position: true } }));
      await prisma.catalogVersion.create({ data: { generationId, position, name: listName(request.body.name) } });
      return reply.status(201).send(await readCatalog());
    },
  );

  routes.post(
    `${CATALOG_LEVEL_PATHS.version}/:id/years`,
    { schema: { params, body: catalogYearInputSchema, response: added } },
    async (request, reply) => {
      const versionId = request.params.id;
      if (!(await prisma.catalogVersion.findUnique({ where: { id: versionId }, select: { id: true } }))) {
        return notFound(reply);
      }
      const { year } = request.body;
      if (await prisma.catalogYear.findFirst({ where: { versionId, year }, select: { id: true } })) {
        return conflict(reply, `${year} is a year of this version already.`);
      }
      const position = nextPosition(await prisma.catalogYear.aggregate({ where: { versionId }, _max: { position: true } }));
      await prisma.catalogYear.create({ data: { versionId, position, year } });
      return reply.status(201).send(await readCatalog());
    },
  );

  routes.patch(
    `${CATALOG_LEVEL_PATHS.model}/:id`,
    { schema: { params, body: catalogNameSchema, response: changed } },
    async (request, reply) => {
      const node = await prisma.catalogModel.findUnique({ where: { id: request.params.id }, select: { vehicleModel: { select: { id: true, brandId: true } } } });
      if (!node) {
        return notFound(reply);
      }
      const name = listName(request.body.name);
      const nameKey = optionKey(name);
      const { id, brandId } = node.vehicleModel;
      const other = await prisma.vehicleModel.findUnique({ where: { brandId_nameKey: { brandId, nameKey } }, select: { id: true, name: true } });
      if (other && other.id !== id) {
        return conflict(reply, `"${other.name}" is already a model of this brand.`);
      }
      await prisma.vehicleModel.update({ where: { id }, data: { name, nameKey } });
      return readCatalog();
    },
  );

  routes.patch(
    `${CATALOG_LEVEL_PATHS.generation}/:id`,
    { schema: { params, body: catalogGenerationInputSchema, response: changed } },
    async (request, reply) => {
      const { id } = request.params;
      if (!(await prisma.catalogGeneration.findUnique({ where: { id }, select: { id: true } }))) {
        return notFound(reply);
      }
      const { name, firstYear, lastYear } = request.body;
      await prisma.catalogGeneration.update({ where: { id }, data: { name: listName(name), firstYear, lastYear } });
      return readCatalog();
    },
  );

  routes.patch(
    `${CATALOG_LEVEL_PATHS.version}/:id`,
    { schema: { params, body: catalogNameSchema, response: changed } },
    async (request, reply) => {
      const { id } = request.params;
      if (!(await prisma.catalogVersion.findUnique({ where: { id }, select: { id: true } }))) {
        return notFound(reply);
      }
      await prisma.catalogVersion.update({ where: { id }, data: { name: listName(request.body.name) } });
      return readCatalog();
    },
  );

  routes.patch(
    `${CATALOG_LEVEL_PATHS.year}/:id`,
    { schema: { params, body: catalogYearInputSchema, response: changed } },
    async (request, reply) => {
      const { id } = request.params;
      const node = await prisma.catalogYear.findUnique({ where: { id }, select: { versionId: true } });
      if (!node) {
        return notFound(reply);
      }
      const { year } = request.body;
      if (await prisma.catalogYear.findFirst({ where: { versionId: node.versionId, year, id: { not: id } }, select: { id: true } })) {
        return conflict(reply, `${year} is a year of this version already.`);
      }
      await prisma.catalogYear.update({ where: { id }, data: { year } });
      return readCatalog();
    },
  );

  for (const [level, path] of Object.entries(CATALOG_LEVEL_PATHS) as [CatalogEditLevel, string][]) {
    routes.post(`${path}/:id/move`, { schema: { params, body: catalogMoveSchema, response: changed } }, async (request, reply) => {
      const { id } = request.params;
      const siblings = await siblingsOf(level, id);
      if (!siblings) {
        return notFound(reply);
      }
      const index = siblings.indexOf(id);
      const target = request.body.direction === "up" ? index - 1 : index + 1;
      if (target >= 0 && target < siblings.length) {
        [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
        await reorder(level, siblings);
      }
      return readCatalog();
    });

    routes.delete(`${path}/:id`, { schema: { params, response: changed } }, async (request, reply) => {
      const { id } = request.params;
      if (!(await siblingsOf(level, id))) {
        return notFound(reply);
      }
      await removeNode(level, id);
      return readCatalog();
    });
  }
}
