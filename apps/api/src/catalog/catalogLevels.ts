import type { CatalogEditLevel } from "@apc/domain/catalog";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../db/client.js";

// How the catalog's edits reach each level of a model's tree that is moved and deleted as a node: models, generations,
// versions and periods (the "year" level). Each level finds a node's siblings, writes their new order, deletes a node
// with everything under it, and counts the items whose vehicles use a node, which keep it from being deleted: item
// vehicles point at generations and versions, so a model counts its generations' items and a period none.

/** Orders siblings by their place, and those that share one by id, so a move always finds the same order. */
const SIBLINGS = { orderBy: [{ position: "asc" as const }, { id: "asc" as const }], select: { id: true } };

/** How the catalog reaches the nodes of one level. */
type LevelAccess = {
  /** Lists a node's siblings, itself included, in their order: their ids, or null when the node isn't there. */
  siblings: (id: string) => Promise<string[] | null>;
  /** Writes the places of some siblings in their new order, in one transaction. */
  reorder: (ids: readonly string[]) => Promise<unknown>;
  /** Deletes a node and everything under it. */
  remove: (id: string) => Promise<unknown>;
  /** Counts the items with a vehicle of a node, or of something under it. */
  itemsUsing: (id: string) => Promise<number>;
};

/** Each level of a model's tree that is moved and deleted as a node. */
export const CATALOG_LEVELS: Record<CatalogEditLevel, LevelAccess> = {
  model: {
    siblings: async (id) => {
      const node = await prisma.catalogModel.findUnique({ where: { id }, select: { vehicleModel: { select: { brandId: true } } } });
      return node && ids(await prisma.catalogModel.findMany({ where: { vehicleModel: { brandId: node.vehicleModel.brandId } }, ...SIBLINGS }));
    },
    reorder: (ids) => prisma.$transaction(ids.map((id, position) => prisma.catalogModel.update({ where: { id }, data: { position } }))),
    remove: (id) => prisma.catalogModel.delete({ where: { id } }),
    itemsUsing: (id) => itemsWithVehicle({ generation: { modelId: id } }),
  },
  generation: {
    siblings: async (id) => {
      const node = await prisma.catalogGeneration.findUnique({ where: { id }, select: { modelId: true } });
      return node && ids(await prisma.catalogGeneration.findMany({ where: { modelId: node.modelId }, ...SIBLINGS }));
    },
    reorder: (ids) => prisma.$transaction(ids.map((id, position) => prisma.catalogGeneration.update({ where: { id }, data: { position } }))),
    remove: (id) => prisma.catalogGeneration.delete({ where: { id } }),
    itemsUsing: (id) => itemsWithVehicle({ generationId: id }),
  },
  version: {
    siblings: async (id) => {
      const node = await prisma.catalogVersion.findUnique({ where: { id }, select: { generationId: true } });
      return node && ids(await prisma.catalogVersion.findMany({ where: { generationId: node.generationId }, ...SIBLINGS }));
    },
    reorder: (ids) => prisma.$transaction(ids.map((id, position) => prisma.catalogVersion.update({ where: { id }, data: { position } }))),
    remove: (id) => prisma.catalogVersion.delete({ where: { id } }),
    itemsUsing: (id) => itemsWithVehicle({ versionId: id }),
  },
  year: {
    siblings: async (id) => {
      const node = await prisma.catalogYear.findUnique({ where: { id }, select: { versionId: true } });
      return node && ids(await prisma.catalogYear.findMany({ where: { versionId: node.versionId }, ...SIBLINGS }));
    },
    reorder: (ids) => prisma.$transaction(ids.map((id, position) => prisma.catalogYear.update({ where: { id }, data: { position } }))),
    remove: (id) => prisma.catalogYear.delete({ where: { id } }),
    itemsUsing: async () => 0,
  },
};

/**
 * Lists the ids of some rows.
 * @param rows The rows.
 * @returns Their ids, in the same order.
 */
function ids(rows: { id: string }[]): string[] {
  return rows.map((row) => row.id);
}

/**
 * Counts the items with some vehicle that matches.
 * @param vehicle What the vehicle matches.
 * @returns How many items.
 */
export function itemsWithVehicle(vehicle: Prisma.ItemVehicleWhereInput): Promise<number> {
  return prisma.item.count({ where: { vehicles: { some: vehicle } } });
}
