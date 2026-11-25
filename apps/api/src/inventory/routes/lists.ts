import type { FastifyInstance, FastifyReply } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import {
  ITEM_LIST_PATHS,
  listEntriesSchema,
  listEntryCreateSchema,
  listEntryIdParamsSchema,
  listEntryMergedSchema,
  listEntryMergeSchema,
  listEntrySchema,
  vehicleModelCreateSchema,
  vehicleModelSchema,
  vehicleModelsSchema,
} from "@apc/domain/lists";
import { answer, refuse, type Result } from "../../http/replies.js";
import {
  addEntry,
  addVehicleModel,
  listEntries,
  listVehicleModels,
  mergeEntry,
  mergeVehicleModel,
  NAME_LIST_KINDS,
  removeEntry,
  removeVehicleModel,
  renameEntry,
  renameVehicleModel,
  type Added,
} from "../lists.js";

// The routes of the lists the item form picks from (see ../lists.ts for their rules). GET sends a list sorted by name;
// POST answers the entry the list held (200) or the one added (201); PATCH answers the entry renamed; POST .../:id/merge
// answers how many items moved; DELETE answers 204. A refusal answers its status: 404 for an entry or vehicle brand
// that isn't there, 409 for a name another entry has, a merge the list can't take or an entry items use.

/**
 * Answers an entry the list held (200) or the one added (201).
 * @param reply Reply to send.
 * @param added The entry, and whether it was added.
 * @returns The entry, or the sent reply.
 */
function answerAdded<Entry>(reply: FastifyReply, { entry, created }: Added<Entry>) {
  return created ? reply.status(201).send(entry) : entry;
}

/**
 * Answers an entry deleted (204), or its refusal.
 * @param reply Reply to send.
 * @param result What the deletion gave.
 * @returns The sent reply.
 */
function answerRemoved(reply: FastifyReply, result: Result<null>) {
  return result.ok ? reply.status(204).send() : refuse(reply, result.rejection);
}

/**
 * Registers the routes of the item lists.
 * @param app The Fastify app.
 */
export function registerListRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();
  const params = listEntryIdParamsSchema;

  for (const kind of NAME_LIST_KINDS) {
    const path = ITEM_LIST_PATHS[kind];
    routes.get(path, { schema: { response: { 200: listEntriesSchema } } }, () => listEntries(kind));

    routes.post(
      path,
      { schema: { body: listEntryCreateSchema, response: { 200: listEntrySchema, 201: listEntrySchema } } },
      async (request, reply) => answerAdded(reply, await addEntry(kind, request.body.name)),
    );

    routes.patch(
      `${path}/:id`,
      { schema: { params, body: listEntryCreateSchema, response: { 200: listEntrySchema } } },
      async (request, reply) => answer(reply, await renameEntry(kind, request.params.id, request.body.name)),
    );

    routes.post(
      `${path}/:id/merge`,
      { schema: { params, body: listEntryMergeSchema, response: { 200: listEntryMergedSchema } } },
      async (request, reply) => answer(reply, await mergeEntry(kind, request.params.id, request.body.into)),
    );

    routes.delete(`${path}/:id`, { schema: { params } }, async (request, reply) => answerRemoved(reply, await removeEntry(kind, request.params.id)));
  }

  const modelsPath = ITEM_LIST_PATHS.vehicleModels;

  routes.get(modelsPath, { schema: { response: { 200: vehicleModelsSchema } } }, () => listVehicleModels());

  routes.post(
    modelsPath,
    { schema: { body: vehicleModelCreateSchema, response: { 200: vehicleModelSchema, 201: vehicleModelSchema } } },
    async (request, reply) => {
      const added = await addVehicleModel(request.body.vehicleBrandId, request.body.name);
      return added.ok ? answerAdded(reply, added.value) : refuse(reply, added.rejection);
    },
  );

  routes.patch(
    `${modelsPath}/:id`,
    { schema: { params, body: listEntryCreateSchema, response: { 200: vehicleModelSchema } } },
    async (request, reply) => answer(reply, await renameVehicleModel(request.params.id, request.body.name)),
  );

  routes.post(
    `${modelsPath}/:id/merge`,
    { schema: { params, body: listEntryMergeSchema, response: { 200: listEntryMergedSchema } } },
    async (request, reply) => answer(reply, await mergeVehicleModel(request.params.id, request.body.into)),
  );

  routes.delete(`${modelsPath}/:id`, { schema: { params } }, async (request, reply) => answerRemoved(reply, await removeVehicleModel(request.params.id)));
}
