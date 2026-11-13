import { joinCatalogTrees, type CatalogJoinStep } from "@apc/domain/catalog";
import type { Prisma } from "../generated/prisma/client.js";

// A catalog model's tree as the API reads it, and the merge of one vehicle model's place in the catalog into another's:
// the tree moves to the model merged into, or, when that model has one too, the two trees join (joinCatalogTrees in
// @apc/domain/catalog), in the merge's transaction.

/** Orders a level of the catalog by its place among its siblings. */
const IN_ORDER = { orderBy: { position: "asc" } } as const;
/** A catalog model's generations, with their versions, years and engines with their sheets, each level in its order. */
export const CATALOG_GENERATIONS = {
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
} as const;

/**
 * Moves a node of a tree to the end of its new parent's, or drops one whose children joined its twin's.
 * @param tx Database client, in the merge's transaction.
 * @param step The step.
 */
async function applyStep(tx: Prisma.TransactionClient, step: CatalogJoinStep): Promise<void> {
  if (step.kind === "drop") {
    const where = { where: { id: step.id } };
    if (step.level === "generation") {
      await tx.catalogGeneration.delete(where);
    } else if (step.level === "version") {
      await tx.catalogVersion.delete(where);
    } else {
      await tx.catalogYear.delete(where);
    }
    return;
  }
  const { id, parentId } = step;
  /** The place after the last of some siblings. */
  const next = (last: { _max: { position: number | null } }) => (last._max.position ?? -1) + 1;
  switch (step.level) {
    case "generation": {
      const position = next(await tx.catalogGeneration.aggregate({ where: { modelId: parentId }, _max: { position: true } }));
      await tx.catalogGeneration.update({ where: { id }, data: { modelId: parentId, position } });
      return;
    }
    case "version": {
      const position = next(await tx.catalogVersion.aggregate({ where: { generationId: parentId }, _max: { position: true } }));
      await tx.catalogVersion.update({ where: { id }, data: { generationId: parentId, position } });
      return;
    }
    case "year": {
      const position = next(await tx.catalogYear.aggregate({ where: { versionId: parentId }, _max: { position: true } }));
      await tx.catalogYear.update({ where: { id }, data: { versionId: parentId, position } });
      return;
    }
    case "engine": {
      const position = next(await tx.catalogEngine.aggregate({ where: { yearId: parentId }, _max: { position: true } }));
      await tx.catalogEngine.update({ where: { id }, data: { yearId: parentId, position } });
    }
  }
}

/**
 * Takes a vehicle model's place in the catalog to another vehicle model it is merged into: its tree moves there when
 * that model has none, or joins that model's tree when it has one; nothing happens for a model the catalog doesn't have.
 * @param tx Database client, in the merge's transaction.
 * @param from The vehicle model merged away.
 * @param into The vehicle model it is merged into.
 */
export async function mergeCatalogModel(tx: Prisma.TransactionClient, from: string, into: string): Promise<void> {
  const select = { id: true, generations: CATALOG_GENERATIONS };
  const [merged, kept] = await Promise.all([
    tx.catalogModel.findUnique({ where: { vehicleModelId: from }, select }),
    tx.catalogModel.findUnique({ where: { vehicleModelId: into }, select }),
  ]);
  if (!merged) {
    return;
  }
  if (!kept) {
    await tx.catalogModel.update({ where: { id: merged.id }, data: { vehicleModelId: into } });
    return;
  }
  for (const step of joinCatalogTrees(kept, merged).steps) {
    await applyStep(tx, step);
  }
  await tx.catalogModel.delete({ where: { id: merged.id } });
}
