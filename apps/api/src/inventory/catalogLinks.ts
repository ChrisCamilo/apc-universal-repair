import { brandMark } from "@apc/domain/catalog";
import { optionKey, type ItemVehicleCreate } from "@apc/domain/items";
import { listName } from "@apc/domain/lists";
import type { Prisma } from "../generated/prisma/client.js";

// Links an item's vehicle to the Catalog: its generation is the model's generation of the same years, and its version
// the generation's version of the same name, ignoring case, accents and extra spaces. What the Catalog doesn't have yet
// is added to it, at the end of its siblings, as the Catalog tab adds it: the vehicle brand's catalog brand (with its
// letters), the model's catalog model, a generation named after its place ("G3"), and the version, with the writing
// rule. A vehicle without a model or a generation has no link; the API refuses a version without a generation.

/** The catalog ids of a vehicle: its generation and its version, null when it has none. */
export type CatalogLinks = { generationId: string | null; versionId: string | null };

/**
 * Finds the next place at the end of some siblings.
 * @param last The last sibling's place, if any.
 * @returns The place after it, or 0 for the first.
 */
function nextPosition(last: { _max: { position: number | null } }): number {
  return (last._max.position ?? -1) + 1;
}

/**
 * Finds, or adds, the catalog model of a vehicle model, and its brand's catalog brand when the Catalog hasn't it.
 * @param tx Database client, in the transaction that saves the item.
 * @param vehicleBrandId The vehicle model's brand.
 * @param vehicleModelId The vehicle model.
 * @returns The catalog model's id.
 */
async function catalogModelOf(tx: Prisma.TransactionClient, vehicleBrandId: string, vehicleModelId: string): Promise<string> {
  const held = await tx.catalogModel.findUnique({ where: { vehicleModelId }, select: { id: true } });
  if (held) {
    return held.id;
  }
  if (!(await tx.catalogBrand.findUnique({ where: { brandId: vehicleBrandId }, select: { id: true } }))) {
    const brand = await tx.brand.findUniqueOrThrow({ where: { id: vehicleBrandId }, select: { name: true } });
    const position = nextPosition(await tx.catalogBrand.aggregate({ _max: { position: true } }));
    await tx.catalogBrand.create({ data: { brandId: vehicleBrandId, mark: brandMark(brand.name), position } });
  }
  const position = nextPosition(await tx.catalogModel.aggregate({ where: { vehicleModel: { brandId: vehicleBrandId } }, _max: { position: true } }));
  return (await tx.catalogModel.create({ data: { vehicleModelId, position }, select: { id: true } })).id;
}

/**
 * Links a vehicle to the Catalog's generation and version, adding to the Catalog what it doesn't have yet.
 * @param tx Database client, in the transaction that saves the item.
 * @param ids The vehicle's brand and model in the lists (listIds).
 * @param vehicle The vehicle as sent: its generation's years and its version.
 * @returns Its generation's and version's ids, null without a model or a generation.
 */
export async function catalogLinks(
  tx: Prisma.TransactionClient,
  ids: { vehicleBrandId: string; vehicleModelId: string | null },
  vehicle: ItemVehicleCreate,
): Promise<CatalogLinks> {
  if (!ids.vehicleModelId || vehicle.firstYear == null) {
    return { generationId: null, versionId: null };
  }
  const modelId = await catalogModelOf(tx, ids.vehicleBrandId, ids.vehicleModelId);
  const lastYear = vehicle.lastYear ?? null;
  const generations = await tx.catalogGeneration.findMany({
    where: { modelId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { id: true, firstYear: true, lastYear: true },
  });
  const generationId =
    generations.find((each) => each.firstYear === vehicle.firstYear && each.lastYear === lastYear)?.id ??
    (
      await tx.catalogGeneration.create({
        data: {
          modelId,
          position: nextPosition(await tx.catalogGeneration.aggregate({ where: { modelId }, _max: { position: true } })),
          name: `G${generations.length + 1}`,
          firstYear: vehicle.firstYear,
          lastYear,
        },
        select: { id: true },
      })
    ).id;
  const name = vehicle.version?.trim();
  if (!name) {
    return { generationId, versionId: null };
  }
  const versions = await tx.catalogVersion.findMany({ where: { generationId }, select: { id: true, name: true } });
  const versionId =
    versions.find((each) => optionKey(each.name) === optionKey(name))?.id ??
    (
      await tx.catalogVersion.create({
        data: {
          generationId,
          position: nextPosition(await tx.catalogVersion.aggregate({ where: { generationId }, _max: { position: true } })),
          name: listName(name),
        },
        select: { id: true },
      })
    ).id;
  return { generationId, versionId };
}
