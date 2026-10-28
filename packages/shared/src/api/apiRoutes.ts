import type { z } from "zod";
import { loggedInSchema } from "../auth/auth.ts";
import { itemImportResultSchema } from "../items/itemCsv.ts";
import { itemListResponseSchema, itemSchema } from "../items/items.ts";
import { ITEM_LIST_PATHS, listEntriesSchema, listEntryMergedSchema, listEntrySchema, vehicleModelSchema, vehicleModelsSchema } from "../lists/lists.ts";
import { healthResponseSchema } from "../schemas/health.ts";

// The API's routes, each with the shared schema of the body it answers with, by status: what the API's server
// registers, and what the web app's demo answers in the browser (apps/web/src/demo/demoApi.ts). A test on each side
// checks its routes against this list (apps/api/src/routes/apiRoutes.test.ts, apps/web/src/demo/demoRoutes.test.ts),
// and the demo's answers against these schemas, so a route the API gains, loses or changes without the demo fails.
// A route that answers no JSON body (204, or a file) has no schema.

/** The paths of the item lists of names, which each have the same routes. */
const NAME_LIST_PATHS = [ITEM_LIST_PATHS.categories, ITEM_LIST_PATHS.partBrands, ITEM_LIST_PATHS.vehicleBrands];

/** Every route of the API, as Fastify writes its path, e.g. "/items/:id". */
export const API_ROUTES: readonly ApiRoute[] = [
  { method: "GET", path: "/health", responses: { 200: healthResponseSchema } },
  { method: "POST", path: "/users", responses: { 201: loggedInSchema } },
  { method: "POST", path: "/sessions", responses: { 200: loggedInSchema } },
  { method: "DELETE", path: "/sessions/current", responses: {} },
  { method: "PUT", path: "/users/me/inventory-tutorial", responses: {} },
  { method: "GET", path: "/items", responses: { 200: itemListResponseSchema } },
  { method: "POST", path: "/items", responses: { 201: itemSchema } },
  { method: "POST", path: "/items/import", responses: { 200: itemImportResultSchema } },
  { method: "PATCH", path: "/items/:id", responses: { 200: itemSchema } },
  { method: "DELETE", path: "/items/:id", responses: {} },
  { method: "PUT", path: "/items/:id/brands/:brandId/photos", responses: { 200: itemSchema } },
  { method: "GET", path: "/photos/:file", responses: {} },
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
