import {
  brandMark,
  periodInGeneration,
  periodsSpan,
  type CatalogData,
  type CatalogEditLevel,
  type CatalogEngineInput,
  type CatalogGenerationInput,
  type GenerationYears,
  type PeriodYears,
} from "@apc/domain/catalog";
import { optionKey } from "@apc/domain/items";
import { listName } from "@apc/domain/lists";
import { prisma } from "../db/client.js";
import { badRequest, conflict, done, notFound, refused, type Rejection, type Result } from "../http/replies.js";
import { CATALOG_LEVELS, itemsWithVehicle } from "./catalogLevels.js";
import { CATALOG_GENERATIONS } from "./catalogTree.js";

// The vehicle catalog of the Catalog tab (see @apc/domain/catalog), as its routes read and edit it (see
// routes/catalog.ts). The whole catalog is every catalog brand in the rail's order, by its vehicle brand's id and name,
// each with its models by their vehicle model's name, and under them the generations, versions, periods (the "year"
// level: a first and a last year) and engines with their sheets, each level in its order.
// Every edit gives the whole catalog, or why it was refused. A brand is added by name: the vehicle brand of that name,
// added to the lists when they don't hold it, becomes a catalog brand at the end of the rail, refused when it is one
// already (409), and deleted with its models' trees, its vehicle brand and models staying in the lists, so no item
// loses a vehicle. A model is added under a catalog brand the same way, from its vehicle models, refused when the brand
// has it in the catalog already. A generation (with its years), a version and a period are added at the end of their
// parent's; a version can't have the same period twice (409), though its periods may overlap. Each of these is renamed
// (a model by renaming its vehicle model, refused when another model of the brand has the name), moved up or down among
// its siblings (past the ends it stays put), and deleted with everything under it; a model's vehicle model stays in the
// lists. An engine is added under a period with its sheet (displacement, cylinders, drive and summary), at the end of
// the period's, and its sheet is saved again; its name and its sheet's title come from the sheet and the tree. A node or
// parent that isn't there is refused with 404. Item vehicles point at generations and versions, so a brand or node an
// item uses, or one with such a node under it, isn't deleted (409): the item's vehicle changes first. Renaming a
// version or changing a generation's years shows on the items that use them. A period stays inside its generation's
// years, which count as inside, and a generation's years keep the ones its periods cover: a period added or changed
// outside them, or a generation's years changed past its periods', is refused with 400 (see periodInGeneration).

/** The years of a generation, which its periods keep to. */
const GENERATION_YEARS = { firstYear: true, lastYear: true } as const;
/** Orders a level of the catalog by its place among its siblings. */
const IN_ORDER = { orderBy: { position: "asc" } } as const;
/** Refuses a node, or a parent to add under, that isn't there. */
const NODE_NOT_FOUND = notFound("nodeNotFound", "Catalog node not found.");

/** What an edit gives: the whole catalog, or why it was refused. */
type CatalogEdit = Promise<Result<CatalogData>>;

/**
 * Adds a brand to the end of the rail, by name: the vehicle brand of that name, added to the lists when they don't hold
 * it.
 * @param typed The name as typed.
 * @returns The catalog, or a refusal when the catalog has the brand already.
 */
export async function addBrand(typed: string): CatalogEdit {
  const name = listName(typed);
  const nameKey = optionKey(name);
  const select = { id: true, name: true, catalog: { select: { id: true } } };
  const brand = (await prisma.brand.findUnique({ where: { nameKey }, select })) ?? (await prisma.brand.create({ data: { name, nameKey }, select }));
  if (brand.catalog) {
    return refused(conflict("brandInCatalog", `"${brand.name}" is in the catalog already.`));
  }
  const position = nextPosition(await prisma.catalogBrand.aggregate({ _max: { position: true } }));
  await prisma.catalogBrand.create({ data: { brandId: brand.id, mark: brandMark(brand.name), position } });
  return done(await readCatalog());
}

/**
 * Adds an engine with its sheet at the end of a period's.
 * @param yearId The period.
 * @param sheet The engine's sheet.
 * @returns The catalog, or a refusal when the period isn't there.
 */
export async function addEngine(yearId: string, sheet: CatalogEngineInput): CatalogEdit {
  if (!(await prisma.catalogYear.findUnique({ where: { id: yearId }, select: { id: true } }))) {
    return refused(NODE_NOT_FOUND);
  }
  const position = nextPosition(await prisma.catalogEngine.aggregate({ where: { yearId }, _max: { position: true } }));
  await prisma.catalogEngine.create({ data: { yearId, position, ...sheet } });
  return done(await readCatalog());
}

/**
 * Adds a generation, with its years, at the end of a model's.
 * @param modelId The catalog model.
 * @param generation Its name and years.
 * @returns The catalog, or a refusal when the model isn't there.
 */
export async function addGeneration(modelId: string, { name, firstYear, lastYear }: CatalogGenerationInput): CatalogEdit {
  if (!(await prisma.catalogModel.findUnique({ where: { id: modelId }, select: { id: true } }))) {
    return refused(NODE_NOT_FOUND);
  }
  const position = nextPosition(await prisma.catalogGeneration.aggregate({ where: { modelId }, _max: { position: true } }));
  await prisma.catalogGeneration.create({ data: { modelId, position, name: listName(name), firstYear, lastYear } });
  return done(await readCatalog());
}

/**
 * Adds a model to the end of a catalog brand's, by name: the brand's vehicle model of that name, added to the lists
 * when they don't hold it.
 * @param brandId The catalog brand's vehicle brand.
 * @param typed The name as typed.
 * @returns The catalog, or a refusal when the brand isn't in the catalog or has the model there already.
 */
export async function addModel(brandId: string, typed: string): CatalogEdit {
  if (!(await prisma.catalogBrand.findUnique({ where: { brandId }, select: { id: true } }))) {
    return refused(NODE_NOT_FOUND);
  }
  const name = listName(typed);
  const nameKey = optionKey(name);
  const select = { id: true, name: true, catalogModel: { select: { id: true } } };
  const vehicleModel =
    (await prisma.vehicleModel.findUnique({ where: { brandId_nameKey: { brandId, nameKey } }, select })) ??
    (await prisma.vehicleModel.create({ data: { name, nameKey, brandId }, select }));
  if (vehicleModel.catalogModel) {
    return refused(conflict("modelInCatalog", `"${vehicleModel.name}" is in the catalog already.`));
  }
  const position = nextPosition(await prisma.catalogModel.aggregate({ where: { vehicleModel: { brandId } }, _max: { position: true } }));
  await prisma.catalogModel.create({ data: { vehicleModelId: vehicleModel.id, position } });
  return done(await readCatalog());
}

/**
 * Adds a period at the end of a version's, inside its generation's years.
 * @param versionId The version.
 * @param period Its first and last year.
 * @returns The catalog, or a refusal when the version isn't there, the period is outside its generation's years or
 * the version has it already.
 */
export async function addPeriod(versionId: string, { year, lastYear }: PeriodYears): CatalogEdit {
  const version = await prisma.catalogVersion.findUnique({ where: { id: versionId }, select: { generation: { select: GENERATION_YEARS } } });
  if (!version) {
    return refused(NODE_NOT_FOUND);
  }
  if (!periodInGeneration({ year, lastYear }, version.generation)) {
    return refused(outsideGeneration(version.generation));
  }
  if (await prisma.catalogYear.findFirst({ where: { versionId, year, lastYear }, select: { id: true } })) {
    return refused(periodTaken({ year, lastYear }));
  }
  const position = nextPosition(await prisma.catalogYear.aggregate({ where: { versionId }, _max: { position: true } }));
  await prisma.catalogYear.create({ data: { versionId, position, year, lastYear } });
  return done(await readCatalog());
}

/**
 * Adds a version at the end of a generation's.
 * @param generationId The generation.
 * @param typed The name as typed.
 * @returns The catalog, or a refusal when the generation isn't there.
 */
export async function addVersion(generationId: string, typed: string): CatalogEdit {
  if (!(await prisma.catalogGeneration.findUnique({ where: { id: generationId }, select: { id: true } }))) {
    return refused(NODE_NOT_FOUND);
  }
  const position = nextPosition(await prisma.catalogVersion.aggregate({ where: { generationId }, _max: { position: true } }));
  await prisma.catalogVersion.create({ data: { generationId, position, name: listName(typed) } });
  return done(await readCatalog());
}

/**
 * Changes a generation's name and years, which must keep the years its periods cover.
 * @param id The generation.
 * @param generation Its name and years.
 * @returns The catalog, or a refusal when the generation isn't there or its years would leave out one of its periods.
 */
export async function changeGeneration(id: string, { name, firstYear, lastYear }: CatalogGenerationInput): CatalogEdit {
  if (!(await prisma.catalogGeneration.findUnique({ where: { id }, select: { id: true } }))) {
    return refused(NODE_NOT_FOUND);
  }
  const span = periodsSpan(await prisma.catalogYear.findMany({ where: { version: { generationId: id } }, select: { year: true, lastYear: true } }));
  if (span && !periodInGeneration(span, { firstYear, lastYear })) {
    return refused(badRequest("periodsOutsideYears", `This generation's periods cover ${span.year}–${span.lastYear}, which its years must keep.`));
  }
  await prisma.catalogGeneration.update({ where: { id }, data: { name: listName(name), firstYear, lastYear } });
  return done(await readCatalog());
}

/**
 * Changes a period's years, inside its generation's.
 * @param id The period.
 * @param period Its first and last year.
 * @returns The catalog, or a refusal when the period isn't there, its years are outside its generation's or another
 * period of its version has them.
 */
export async function changePeriod(id: string, { year, lastYear }: PeriodYears): CatalogEdit {
  const node = await prisma.catalogYear.findUnique({ where: { id }, select: { versionId: true, version: { select: { generation: { select: GENERATION_YEARS } } } } });
  if (!node) {
    return refused(NODE_NOT_FOUND);
  }
  if (!periodInGeneration({ year, lastYear }, node.version.generation)) {
    return refused(outsideGeneration(node.version.generation));
  }
  if (await prisma.catalogYear.findFirst({ where: { versionId: node.versionId, year, lastYear, id: { not: id } }, select: { id: true } })) {
    return refused(periodTaken({ year, lastYear }));
  }
  await prisma.catalogYear.update({ where: { id }, data: { year, lastYear } });
  return done(await readCatalog());
}

/**
 * Refuses deleting a node, or a brand, some items' vehicles use.
 * @param count How many items use it.
 * @returns The refusal.
 */
function inUse(count: number): Rejection {
  return conflict("nodeInUse", `${count} ${count === 1 ? "item uses" : "items use"} it in the stock.`);
}

/**
 * Moves a node up or down among its siblings; past the ends it stays put.
 * @param level The node's level.
 * @param id The node.
 * @param direction Where it moves.
 * @returns The catalog, or a refusal when the node isn't there.
 */
export async function moveNode(level: CatalogEditLevel, id: string, direction: "up" | "down"): CatalogEdit {
  const siblings = await CATALOG_LEVELS[level].siblings(id);
  if (!siblings) {
    return refused(NODE_NOT_FOUND);
  }
  const index = siblings.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (target >= 0 && target < siblings.length) {
    [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
    await CATALOG_LEVELS[level].reorder(siblings);
  }
  return done(await readCatalog());
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
 * Refuses a period outside its generation's years.
 * @param generation The generation's years.
 * @returns The refusal.
 */
function outsideGeneration(generation: GenerationYears): Rejection {
  const years = `${generation.firstYear}–${generation.lastYear ?? ""}`;
  return badRequest("periodOutside", `A period must stay inside its generation's years, ${years}.`);
}

/**
 * Refuses a period its version has already.
 * @param period The period's years.
 * @returns The refusal.
 */
function periodTaken({ year, lastYear }: PeriodYears): Rejection {
  return conflict("periodTaken", `${year}-${lastYear} is a period of this version already.`);
}

/**
 * Reads the whole catalog as the API sends it.
 * @returns The catalog brands in the rail's order, with their trees.
 */
export async function readCatalog(): Promise<CatalogData> {
  const [brands, models] = await Promise.all([
    prisma.catalogBrand.findMany({ ...IN_ORDER, select: { mark: true, brand: { select: { id: true, name: true } } } }),
    prisma.catalogModel.findMany({
      ...IN_ORDER,
      select: { id: true, vehicleModel: { select: { name: true, brandId: true } }, generations: CATALOG_GENERATIONS },
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
 * Takes a brand out of the catalog, with its models' trees; its vehicle brand and models stay in the lists.
 * @param brandId The catalog brand's vehicle brand.
 * @returns The catalog, or a refusal when the brand isn't in the catalog or items use one of its vehicles.
 */
export async function removeBrand(brandId: string): CatalogEdit {
  if (!(await prisma.catalogBrand.findUnique({ where: { brandId }, select: { id: true } }))) {
    return refused(NODE_NOT_FOUND);
  }
  const using = await itemsWithVehicle({ generation: { model: { vehicleModel: { brandId } } } });
  if (using > 0) {
    return refused(inUse(using));
  }
  await prisma.$transaction([
    prisma.catalogModel.deleteMany({ where: { vehicleModel: { brandId } } }),
    prisma.catalogBrand.delete({ where: { brandId } }),
  ]);
  return done(await readCatalog());
}

/**
 * Deletes a node with everything under it.
 * @param level The node's level.
 * @param id The node.
 * @returns The catalog, or a refusal when the node isn't there or items use it or something under it.
 */
export async function removeNode(level: CatalogEditLevel, id: string): CatalogEdit {
  if (!(await CATALOG_LEVELS[level].siblings(id))) {
    return refused(NODE_NOT_FOUND);
  }
  const using = await CATALOG_LEVELS[level].itemsUsing(id);
  if (using > 0) {
    return refused(inUse(using));
  }
  await CATALOG_LEVELS[level].remove(id);
  return done(await readCatalog());
}

/**
 * Renames a model by renaming its vehicle model, which no other model of the brand may have the name of.
 * @param id The catalog model.
 * @param typed The name as typed.
 * @returns The catalog, or a refusal when the model isn't there or another model of its brand has the name.
 */
export async function renameModel(id: string, typed: string): CatalogEdit {
  const node = await prisma.catalogModel.findUnique({ where: { id }, select: { vehicleModel: { select: { id: true, brandId: true } } } });
  if (!node) {
    return refused(NODE_NOT_FOUND);
  }
  const name = listName(typed);
  const nameKey = optionKey(name);
  const { id: vehicleModelId, brandId } = node.vehicleModel;
  const other = await prisma.vehicleModel.findUnique({ where: { brandId_nameKey: { brandId, nameKey } }, select: { id: true, name: true } });
  if (other && other.id !== vehicleModelId) {
    return refused(conflict("modelTaken", `"${other.name}" is already a model of this brand.`));
  }
  await prisma.vehicleModel.update({ where: { id: vehicleModelId }, data: { name, nameKey } });
  return done(await readCatalog());
}

/**
 * Renames a version.
 * @param id The version.
 * @param typed The name as typed.
 * @returns The catalog, or a refusal when the version isn't there.
 */
export async function renameVersion(id: string, typed: string): CatalogEdit {
  if (!(await prisma.catalogVersion.findUnique({ where: { id }, select: { id: true } }))) {
    return refused(NODE_NOT_FOUND);
  }
  await prisma.catalogVersion.update({ where: { id }, data: { name: listName(typed) } });
  return done(await readCatalog());
}

/**
 * Saves an engine's sheet again.
 * @param id The engine.
 * @param sheet Its sheet.
 * @returns The catalog, or a refusal when the engine isn't there.
 */
export async function saveEngine(id: string, sheet: CatalogEngineInput): CatalogEdit {
  if (!(await prisma.catalogEngine.findUnique({ where: { id }, select: { id: true } }))) {
    return refused(NODE_NOT_FOUND);
  }
  await prisma.catalogEngine.update({ where: { id }, data: sheet });
  return done(await readCatalog());
}
