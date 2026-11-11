import type { z } from "zod";
import { entryCodeSchema, loggedInSchema } from "../../auth/auth.ts";
import { CATALOG_BRANDS_PATH, CATALOG_CHILDREN, CATALOG_ENGINES_PATH, CATALOG_LEVEL_PATHS, CATALOG_PATH, catalogSchema } from "../../catalog/catalog.ts";
import { deviceChallengeSchema, deviceListSchema, deviceSchema, deviceStatusSchema } from "../../devices/devices.ts";
import { itemImportResultSchema } from "../../inventory/itemCsv.ts";
import { itemListResponseSchema, itemSchema } from "../../inventory/items.ts";
import { ITEM_LIST_PATHS, listEntriesSchema, listEntryMergedSchema, listEntrySchema, vehicleModelSchema, vehicleModelsSchema } from "../../inventory/lists.ts";
import { healthResponseSchema } from "../schemas/health.ts";

// The API's routes, each with the shared schema of the body it answers with, by status: what the API's server
// registers, and what the web app's demo answers in the browser (apps/web/src/demo/demoApi.ts). A test on each side
// checks its routes against this list (apps/api/src/apiRoutes.test.ts, apps/web/src/demo/demoRoutes.test.ts),
// and the demo's answers against these schemas, so a route the API gains, loses or changes without the demo fails.
// A route that answers no JSON body (204, or a file) has no schema.

/** The paths of the catalog's levels a node is added under: its brands, models, generations and versions. */
const CATALOG_PARENT_PATHS = { brand: CATALOG_BRANDS_PATH, ...CATALOG_LEVEL_PATHS };
/** The paths of the item lists of names, which each have the same routes. */
const NAME_LIST_PATHS = [ITEM_LIST_PATHS.categories, ITEM_LIST_PATHS.partBrands, ITEM_LIST_PATHS.vehicleBrands];

/** Every route of the API, as Fastify writes its path, e.g. "/items/:id". */
export const API_ROUTES: readonly ApiRoute[] = [
  { method: "GET", path: "/health", responses: { 200: healthResponseSchema } },
  { method: "POST", path: "/users", responses: { 201: loggedInSchema } },
  { method: "POST", path: "/sessions", responses: { 200: loggedInSchema } },
  { method: "POST", path: "/sessions/pairing", responses: { 200: loggedInSchema } },
  { method: "DELETE", path: "/sessions/current", responses: {} },
  { method: "POST", path: "/pairings", responses: { 201: entryCodeSchema } },
  { method: "PUT", path: "/users/me/inventory-tutorial", responses: {} },
  { method: "GET", path: "/devices/challenge", responses: { 200: deviceChallengeSchema } },
  { method: "POST", path: "/devices/status", responses: { 200: deviceStatusSchema } },
  { method: "GET", path: "/devices", responses: { 200: deviceListSchema } },
  { method: "POST", path: "/devices/:id/authorize", responses: { 200: deviceSchema } },
  { method: "PATCH", path: "/devices/:id", responses: { 200: deviceSchema } },
  { method: "DELETE", path: "/devices/:id", responses: {} },
  { method: "GET", path: "/items", responses: { 200: itemListResponseSchema } },
  { method: "POST", path: "/items", responses: { 201: itemSchema } },
  { method: "POST", path: "/items/import", responses: { 200: itemImportResultSchema } },
  { method: "PATCH", path: "/items/:id", responses: { 200: itemSchema } },
  { method: "DELETE", path: "/items/:id", responses: {} },
  { method: "PUT", path: "/items/:id/brands/:brandId/photos", responses: { 200: itemSchema } },
  { method: "GET", path: "/photos/:file", responses: {} },
  { method: "GET", path: CATALOG_PATH, responses: { 200: catalogSchema } },
  { method: "POST", path: CATALOG_BRANDS_PATH, responses: { 201: catalogSchema } },
  ...Object.entries(CATALOG_CHILDREN).map(([parent, child]): ApiRoute => ({
    method: "POST",
    path: `${CATALOG_PARENT_PATHS[parent as keyof typeof CATALOG_CHILDREN]}/:id/${child.segment}`,
    responses: { 201: catalogSchema },
  })),
  ...Object.values(CATALOG_LEVEL_PATHS).flatMap((path): ApiRoute[] => [
    { method: "PATCH", path: `${path}/:id`, responses: { 200: catalogSchema } },
    { method: "POST", path: `${path}/:id/move`, responses: { 200: catalogSchema } },
    { method: "DELETE", path: `${path}/:id`, responses: { 200: catalogSchema } },
  ]),
  { method: "PATCH", path: `${CATALOG_ENGINES_PATH}/:id`, responses: { 200: catalogSchema } },
  ...NAME_LIST_PATHS.flatMap((path) => listRoutes(path, listEntriesSchema, listEntrySchema)),
  ...listRoutes(ITEM_LIST_PATHS.vehicleModels, vehicleModelsSchema, vehicleModelSchema),
];

/** A route of the API: its method, its path and the schema of the body of each status it answers with one. */
export type ApiRoute = {
  method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
  path: string;
  responses: Readonly<Partial<Record<number, z.ZodType>>>;
};

/**
 * Lists the routes of an item list: loading it, creating (or finding) an entry, renaming, merging and deleting one.
 * @param path The list's path, e.g. "/categories".
 * @param all The schema of the whole list.
 * @param entry The schema of one entry.
 * @returns The list's routes.
 */
function listRoutes(path: string, all: z.ZodType, entry: z.ZodType): ApiRoute[] {
  return [
    { method: "GET", path, responses: { 200: all } },
    { method: "POST", path, responses: { 200: entry, 201: entry } },
    { method: "PATCH", path: `${path}/:id`, responses: { 200: entry } },
    { method: "POST", path: `${path}/:id/merge`, responses: { 200: listEntryMergedSchema } },
    { method: "DELETE", path: `${path}/:id`, responses: {} },
  ];
}
