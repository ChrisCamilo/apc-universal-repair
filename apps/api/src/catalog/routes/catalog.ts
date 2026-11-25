import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import {
  CATALOG_BRANDS_PATH,
  CATALOG_ENGINES_PATH,
  CATALOG_LEVEL_PATHS,
  CATALOG_PATH,
  catalogEngineInputSchema,
  catalogGenerationInputSchema,
  catalogIdParamsSchema,
  catalogMoveSchema,
  catalogNameSchema,
  catalogSchema,
  catalogYearInputSchema,
  type CatalogEditLevel,
} from "@apc/domain/catalog";
import { answer } from "../../http/replies.js";
import {
  addBrand,
  addEngine,
  addGeneration,
  addModel,
  addPeriod,
  addVersion,
  changeGeneration,
  changePeriod,
  moveNode,
  readCatalog,
  removeBrand,
  removeNode,
  renameModel,
  renameVersion,
  saveEngine,
} from "../catalog.js";

// The vehicle catalog's routes (see ../catalog.ts for its rules). GET sends the whole catalog, and every edit answers
// it again, 201 for something added, or its refusal: 404 for a node or parent that isn't there, 409 for a clash or a
// node items use, 400 for years the tree can't take.

/**
 * Registers the catalog's routes.
 * @param app The Fastify app.
 */
export function registerCatalogRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();
  const params = catalogIdParamsSchema;
  const changed = { 200: catalogSchema };
  const added = { 201: catalogSchema };

  routes.get(CATALOG_PATH, { schema: { response: changed } }, () => readCatalog());

  routes.post(CATALOG_BRANDS_PATH, { schema: { body: catalogNameSchema, response: added } }, async (request, reply) =>
    answer(reply, await addBrand(request.body.name), 201),
  );

  routes.delete(`${CATALOG_BRANDS_PATH}/:id`, { schema: { params, response: changed } }, async (request, reply) =>
    answer(reply, await removeBrand(request.params.id)),
  );

  routes.post(`${CATALOG_BRANDS_PATH}/:id/models`, { schema: { params, body: catalogNameSchema, response: added } }, async (request, reply) =>
    answer(reply, await addModel(request.params.id, request.body.name), 201),
  );

  routes.post(
    `${CATALOG_LEVEL_PATHS.model}/:id/generations`,
    { schema: { params, body: catalogGenerationInputSchema, response: added } },
    async (request, reply) => answer(reply, await addGeneration(request.params.id, request.body), 201),
  );

  routes.post(
    `${CATALOG_LEVEL_PATHS.generation}/:id/versions`,
    { schema: { params, body: catalogNameSchema, response: added } },
    async (request, reply) => answer(reply, await addVersion(request.params.id, request.body.name), 201),
  );

  routes.post(
    `${CATALOG_LEVEL_PATHS.version}/:id/years`,
    { schema: { params, body: catalogYearInputSchema, response: added } },
    async (request, reply) => answer(reply, await addPeriod(request.params.id, request.body), 201),
  );

  routes.post(
    `${CATALOG_LEVEL_PATHS.year}/:id/engines`,
    { schema: { params, body: catalogEngineInputSchema, response: added } },
    async (request, reply) => answer(reply, await addEngine(request.params.id, request.body), 201),
  );

  routes.patch(`${CATALOG_ENGINES_PATH}/:id`, { schema: { params, body: catalogEngineInputSchema, response: changed } }, async (request, reply) =>
    answer(reply, await saveEngine(request.params.id, request.body)),
  );

  routes.patch(`${CATALOG_LEVEL_PATHS.model}/:id`, { schema: { params, body: catalogNameSchema, response: changed } }, async (request, reply) =>
    answer(reply, await renameModel(request.params.id, request.body.name)),
  );

  routes.patch(
    `${CATALOG_LEVEL_PATHS.generation}/:id`,
    { schema: { params, body: catalogGenerationInputSchema, response: changed } },
    async (request, reply) => answer(reply, await changeGeneration(request.params.id, request.body)),
  );

  routes.patch(`${CATALOG_LEVEL_PATHS.version}/:id`, { schema: { params, body: catalogNameSchema, response: changed } }, async (request, reply) =>
    answer(reply, await renameVersion(request.params.id, request.body.name)),
  );

  routes.patch(`${CATALOG_LEVEL_PATHS.year}/:id`, { schema: { params, body: catalogYearInputSchema, response: changed } }, async (request, reply) =>
    answer(reply, await changePeriod(request.params.id, request.body)),
  );

  for (const [level, path] of Object.entries(CATALOG_LEVEL_PATHS) as [CatalogEditLevel, string][]) {
    routes.post(`${path}/:id/move`, { schema: { params, body: catalogMoveSchema, response: changed } }, async (request, reply) =>
      answer(reply, await moveNode(level, request.params.id, request.body.direction)),
    );

    routes.delete(`${path}/:id`, { schema: { params, response: changed } }, async (request, reply) =>
      answer(reply, await removeNode(level, request.params.id)),
    );
  }
}
