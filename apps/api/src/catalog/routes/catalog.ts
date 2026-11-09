import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { CATALOG_PATH, catalogSchema } from "@apc/domain/catalog";
import { prisma } from "../../db/client.js";

// The vehicle catalog of the Catalog tab (see @apc/domain/catalog). GET sends every catalog brand in the rail's order,
// by its vehicle brand's id and name, each with its models by their vehicle model's name, and under them the
// generations, versions, years and engines with their sheets, each level in its order.

/** Orders a level of the catalog by its place among its siblings. */
const IN_ORDER = { orderBy: { position: "asc" } } as const;

export function registerCatalogRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(CATALOG_PATH, { schema: { response: { 200: catalogSchema } } }, async () => {
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
  });
}
