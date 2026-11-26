import { optionKey } from "@apc/domain/items";
import { listName, type ItemListKind, type ListEntry, type VehicleModel } from "@apc/domain/lists";
import type { Prisma } from "../generated/prisma/client.js";
import { mergeCatalogModel } from "../catalog/catalogTree.js";
import { prisma } from "../db/client.js";
import { conflict, done, notFound, refused, type Rejection, type Result } from "../http/replies.js";
import type { RefusalReason } from "@apc/domain/refusals";

// The lists the item form picks from, as their routes read and change them (see routes/lists.ts): categories, part
// brands, vehicle brands and vehicle models. A list is read sorted by name. A name is added with the writing rule
// applied, unless the list already holds it ignoring case, accents and extra spaces, which gives the one it holds
// instead of a duplicate. A vehicle model is added under its vehicle brand, and is only the same as a model of that
// brand. An entry is renamed with the same rule, refused when another entry has the name (409, naming that entry, so
// the screen can offer to merge them); the items that use it refer to it, so they show the new name. An entry is
// merged into another of its list (a model into one of its brand) in one transaction: its items move there and it is
// deleted, a vehicle brand's models moving along, those of a name the other brand has joining that model; it gives
// how many items moved, and a merge into itself, or of two part brands an item has both of, is refused (409); an item
// that ends up with a vehicle twice keeps it once. A vehicle brand or model of the catalog takes its place and trees there to
// the entry merged into: a brand's place in the rail goes to a brand the catalog doesn't have, or its models join the
// other's after its own; a model's tree moves to a model with none, or joins its tree (see catalog/catalogTree.ts). An
// entry no item uses is deleted, a vehicle brand with its models; an entry items use is refused naming how many (409).
// Deleting a vehicle brand or model of the catalog takes it out of the catalog too, a brand with its models' trees and
// a model with its own. A part brand is used by the items it makes a brand of, and a vehicle brand or model by the
// items with a vehicle of it. Vehicle brands and models are given saying whether the catalog has them (inCatalog), so
// the screens can say why one can't be merged, and what else a delete takes.

/** The columns a list entry is sent with. */
const ENTRY = { id: true, name: true } as const;
/** The columns a vehicle brand is read with: an entry's, and whether the catalog has it. */
const BRAND = { ...ENTRY, catalog: { select: { brandId: true } } } as const;
/** Refuses a vehicle brand id that doesn't exist. */
const BRAND_NOT_FOUND = notFound("vehicleBrandNotFound", "Vehicle brand not found.");
/** Refuses a list entry id that doesn't exist. */
const ENTRY_NOT_FOUND = notFound("entryNotFound", "List entry not found.");
/** The items using an entry of each list: by their category, or through any of their brands or vehicles. */
const ITEMS_USING: Record<ItemListKind, (id: string) => Prisma.ItemWhereInput> = {
  categories: (id) => ({ categoryId: id }),
  partBrands: (id) => ({ brands: { some: { partBrandId: id } } }),
  vehicleBrands: (id) => ({ vehicles: { some: { vehicleBrandId: id } } }),
  vehicleModels: (id) => ({ vehicles: { some: { vehicleModelId: id } } }),
};
/** The columns a vehicle model is read with, and whether the catalog has it. */
const MODEL = { id: true, name: true, brandId: true, catalogModel: { select: { id: true } } } as const;

/** An entry a list held already, or the one added to it. */
export type Added<Entry> = { entry: Entry; created: boolean };
/** What a merge gives: how many items moved. */
type Merged = { moved: number };
/** The lists of plain names: every list but the vehicle models, which belong to a vehicle brand. */
export type NameListKind = Exclude<ItemListKind, "vehicleModels">;
/** How the rules reach one of the lists of plain names. */
type NameList = {
  all: () => Promise<ListEntry[]>;
  byId: (id: string) => Promise<ListEntry | null>;
  find: (nameKey: string) => Promise<ListEntry | null>;
  create: (name: string, nameKey: string) => Promise<ListEntry>;
  rename: (id: string, name: string, nameKey: string) => Promise<ListEntry>;
  remove: (id: string) => Promise<unknown>;
};

/** The lists of plain names, by their key in ITEM_LIST_PATHS; vehicle brands are the Brand table. */
const NAME_LISTS: Record<NameListKind, NameList> = {
  categories: {
    all: () => prisma.category.findMany({ select: ENTRY }),
    byId: (id) => prisma.category.findUnique({ where: { id }, select: ENTRY }),
    find: (nameKey) => prisma.category.findUnique({ where: { nameKey }, select: ENTRY }),
    create: (name, nameKey) => prisma.category.create({ data: { name, nameKey }, select: ENTRY }),
    rename: (id, name, nameKey) => prisma.category.update({ where: { id }, data: { name, nameKey }, select: ENTRY }),
    remove: (id) => prisma.category.delete({ where: { id } }),
  },
  partBrands: {
    all: () => prisma.partBrand.findMany({ select: ENTRY }),
    byId: (id) => prisma.partBrand.findUnique({ where: { id }, select: ENTRY }),
    find: (nameKey) => prisma.partBrand.findUnique({ where: { nameKey }, select: ENTRY }),
    create: (name, nameKey) => prisma.partBrand.create({ data: { name, nameKey }, select: ENTRY }),
    rename: (id, name, nameKey) => prisma.partBrand.update({ where: { id }, data: { name, nameKey }, select: ENTRY }),
    remove: (id) => prisma.partBrand.delete({ where: { id } }),
  },
  vehicleBrands: {
    all: async () => (await prisma.brand.findMany({ select: BRAND })).map(toBrandEntry),
    byId: async (id) => toFoundBrand(await prisma.brand.findUnique({ where: { id }, select: BRAND })),
    find: async (nameKey) => toFoundBrand(await prisma.brand.findUnique({ where: { nameKey }, select: BRAND })),
    create: async (name, nameKey) => toBrandEntry(await prisma.brand.create({ data: { name, nameKey }, select: BRAND })),
    rename: async (id, name, nameKey) => toBrandEntry(await prisma.brand.update({ where: { id }, data: { name, nameKey }, select: BRAND })),
    // Its models go with it (onDelete: Cascade), and so does its place in the catalog, with its models' trees.
    remove: (id) =>
      prisma.$transaction([
        prisma.catalogModel.deleteMany({ where: { vehicleModel: { brandId: id } } }),
        prisma.catalogBrand.deleteMany({ where: { brandId: id } }),
        prisma.brand.delete({ where: { id } }),
      ]),
  },
};
/** The lists of plain names, each with the same routes. */
export const NAME_LIST_KINDS = Object.keys(NAME_LISTS) as NameListKind[];

/**
 * Adds a name to a list of plain names, with the writing rule applied, unless the list holds it already ignoring case,
 * accents and extra spaces.
 * @param kind The list.
 * @param typed The name as typed.
 * @returns The entry the list holds or the one created, and whether it was created.
 */
export async function addEntry(kind: NameListKind, typed: string): Promise<Added<ListEntry>> {
  const list = NAME_LISTS[kind];
  const name = listName(typed);
  const nameKey = optionKey(name);
  const held = await list.find(nameKey);
  return held ? { entry: held, created: false } : { entry: await list.create(name, nameKey), created: true };
}

/**
 * Adds a vehicle model under its vehicle brand, with the writing rule applied, unless the brand has it already.
 * @param brandId The vehicle brand.
 * @param typed The name as typed.
 * @returns The model the brand has or the one created, and whether it was created; or a refusal when the brand isn't
 * there.
 */
export async function addVehicleModel(brandId: string, typed: string): Promise<Result<Added<VehicleModel>>> {
  if (!(await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } }))) {
    return refused(BRAND_NOT_FOUND);
  }
  const name = listName(typed);
  const nameKey = optionKey(name);
  const held = await prisma.vehicleModel.findUnique({ where: { brandId_nameKey: { brandId, nameKey } }, select: MODEL });
  if (held) {
    return done({ entry: toVehicleModel(held), created: false });
  }
  const created = await prisma.vehicleModel.create({ data: { name, nameKey, brandId }, select: MODEL });
  return done({ entry: toVehicleModel(created), created: true });
}

/**
 * Sorts a list by name the way the form shows it, accents in their alphabetical place.
 * @param entries Entries in any order.
 * @returns The entries sorted by name.
 */
function byName<Entry extends ListEntry>(entries: Entry[]): Entry[] {
  return entries.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/**
 * Takes out the vehicles an item holds twice after a merge, the same brand, model, generation and version, keeping
 * each one's first place.
 * @param tx Database client, in the merge's transaction.
 * @param itemIds The items whose vehicles moved.
 */
async function dropRepeatedVehicles(tx: Prisma.TransactionClient, itemIds: readonly string[]) {
  const rows = await tx.itemVehicle.findMany({
    where: { itemId: { in: [...itemIds] } },
    orderBy: [{ itemId: "asc" }, { position: "asc" }, { id: "asc" }],
    select: { id: true, itemId: true, vehicleBrandId: true, vehicleModelId: true, generationId: true, versionId: true },
  });
  const seen = new Set<string>();
  const repeated = [];
  for (const row of rows) {
    const key = [row.itemId, row.vehicleBrandId, row.vehicleModelId ?? "", row.generationId ?? "", row.versionId ?? ""].join("|");
    if (seen.has(key)) {
      repeated.push(row);
    }
    seen.add(key);
  }
  await tx.itemVehicle.deleteMany({ where: { id: { in: repeated.map((row) => row.id) } } });
}

/**
 * Refuses a change the list can't take.
 * @param reason Why, as a key.
 * @param message What keeps it from being done.
 * @param held How many items use the entry, or the entry that has the name, when that is the reason.
 * @returns The refusal.
 */
function entryConflict(reason: RefusalReason, message: string, held: { itemCount?: number; entryId?: string } = {}): Rejection {
  return conflict(reason, message, [{ field: "id", message, ...held }]);
}

/**
 * Refuses deleting an entry some items use, naming how many.
 * @param kind The entry's list.
 * @param entry The entry.
 * @returns The refusal, or null when no item uses it.
 */
async function inUse(kind: ItemListKind, entry: { id: string; name: string }): Promise<Rejection | null> {
  const itemCount = await prisma.item.count({ where: ITEMS_USING[kind](entry.id) });
  return itemCount > 0 ? entryConflict("entryInUse", `"${entry.name}" is used by ${itemCount} items.`, { itemCount }) : null;
}

/**
 * Reads a list of plain names.
 * @param kind The list.
 * @returns Its entries, sorted by name.
 */
export async function listEntries(kind: NameListKind): Promise<ListEntry[]> {
  return byName(await NAME_LISTS[kind].all());
}

/**
 * Reads every vehicle model.
 * @returns The models, sorted by name.
 */
export async function listVehicleModels(): Promise<VehicleModel[]> {
  return byName((await prisma.vehicleModel.findMany({ select: MODEL })).map(toVehicleModel));
}

/**
 * Merges an entry into another of its list in one transaction: the items using it move there and it is deleted. A
 * vehicle brand's models move to the other brand, and one whose name that brand already has joins its model instead;
 * an item left with a vehicle twice keeps it once.
 * @param kind The list.
 * @param id The entry merged away.
 * @param into The entry it is merged into.
 * @returns How many items moved.
 */
function mergeEntries(kind: ItemListKind, id: string, into: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    if (kind === "categories") {
      const { count } = await tx.item.updateMany({ where: { categoryId: id }, data: { categoryId: into } });
      await tx.category.delete({ where: { id } });
      return count;
    }
    if (kind === "partBrands") {
      const { count } = await tx.itemBrand.updateMany({ where: { partBrandId: id }, data: { partBrandId: into } });
      await tx.partBrand.delete({ where: { id } });
      return count;
    }
    // The items with a vehicle of the entry, before it moves.
    const rows = await tx.itemVehicle.findMany({
      where: kind === "vehicleModels" ? { vehicleModelId: id } : { vehicleBrandId: id },
      distinct: ["itemId"],
      select: { itemId: true },
    });
    const moved = rows.map((row) => row.itemId);
    if (kind === "vehicleModels") {
      await mergeCatalogModel(tx, id, into);
      await tx.itemVehicle.updateMany({ where: { vehicleModelId: id }, data: { vehicleModelId: into } });
      await dropRepeatedVehicles(tx, moved);
      await tx.vehicleModel.delete({ where: { id } });
      return moved.length;
    }
    const [fromCatalog, intoCatalog] = await Promise.all([
      tx.catalogBrand.findUnique({ where: { brandId: id }, select: { id: true } }),
      tx.catalogBrand.findUnique({ where: { brandId: into }, select: { id: true } }),
    ]);
    if (fromCatalog && !intoCatalog) {
      // The brand merged into takes the other's place in the rail, with its models.
      await tx.catalogBrand.update({ where: { id: fromCatalog.id }, data: { brandId: into } });
    }
    for (const model of await tx.vehicleModel.findMany({ where: { brandId: id }, select: { id: true, nameKey: true } })) {
      const twin = await tx.vehicleModel.findUnique({
        where: { brandId_nameKey: { brandId: into, nameKey: model.nameKey } },
        select: { id: true },
      });
      if (twin) {
        await mergeCatalogModel(tx, model.id, twin.id);
        await tx.itemVehicle.updateMany({ where: { vehicleModelId: model.id }, data: { vehicleModelId: twin.id } });
        await tx.vehicleModel.delete({ where: { id: model.id } });
      } else {
        await tx.vehicleModel.update({ where: { id: model.id }, data: { brandId: into } });
        if (fromCatalog && intoCatalog) {
          // Its place in the catalog goes after the other brand's models.
          const last = await tx.catalogModel.aggregate({ where: { vehicleModel: { brandId: into }, NOT: { vehicleModelId: model.id } }, _max: { position: true } });
          await tx.catalogModel.updateMany({ where: { vehicleModelId: model.id }, data: { position: (last._max.position ?? -1) + 1 } });
        }
      }
    }
    if (fromCatalog && intoCatalog) {
      await tx.catalogBrand.delete({ where: { id: fromCatalog.id } });
    }
    await tx.itemVehicle.updateMany({ where: { vehicleBrandId: id }, data: { vehicleBrandId: into } });
    await dropRepeatedVehicles(tx, moved);
    await tx.brand.delete({ where: { id } });
    return moved.length;
  });
}

/**
 * Merges an entry of a list of plain names into another of the list.
 * @param kind The list.
 * @param id The entry merged away.
 * @param into The entry it is merged into.
 * @returns How many items moved; or a refusal when either entry isn't there, it is the same entry, or items have both
 * part brands.
 */
export async function mergeEntry(kind: NameListKind, id: string, into: string): Promise<Result<Merged>> {
  const list = NAME_LISTS[kind];
  const [held, kept] = await Promise.all([list.byId(id), list.byId(into)]);
  if (!held || !kept) {
    return refused(ENTRY_NOT_FOUND);
  }
  if (id === into) {
    return refused(entryConflict("mergeSame", "An entry can't be merged into itself."));
  }
  // A part brand makes an item once: an item with both brands would hold the same part brand twice.
  const both = kind === "partBrands" ? await prisma.item.count({ where: { AND: [ITEMS_USING.partBrands(id), ITEMS_USING.partBrands(into)] } }) : 0;
  if (both > 0) {
    return refused(entryConflict("mergeShared", `${both} items have both "${held.name}" and "${kept.name}".`, { itemCount: both }));
  }
  return done({ moved: await mergeEntries(kind, id, into) });
}

/**
 * Merges a vehicle model into another model of its brand.
 * @param id The model merged away.
 * @param into The model it is merged into.
 * @returns How many items moved; or a refusal when either model isn't there, it is the same model, or the two are of
 * different brands.
 */
export async function mergeVehicleModel(id: string, into: string): Promise<Result<Merged>> {
  const [held, kept] = await Promise.all([
    prisma.vehicleModel.findUnique({ where: { id }, select: MODEL }),
    prisma.vehicleModel.findUnique({ where: { id: into }, select: MODEL }),
  ]);
  if (!held || !kept) {
    return refused(ENTRY_NOT_FOUND);
  }
  if (id === into) {
    return refused(entryConflict("mergeSame", "An entry can't be merged into itself."));
  }
  if (held.brandId !== kept.brandId) {
    return refused(entryConflict("mergeOtherBrand", "A model can only be merged into a model of its brand."));
  }
  return done({ moved: await mergeEntries("vehicleModels", id, into) });
}

/**
 * Deletes an entry of a list of plain names that no item uses; a vehicle brand goes with its models.
 * @param kind The list.
 * @param id The entry.
 * @returns Nothing, or a refusal when the entry isn't there or items use it.
 */
export async function removeEntry(kind: NameListKind, id: string): Promise<Result<null>> {
  const list = NAME_LISTS[kind];
  const held = await list.byId(id);
  if (!held) {
    return refused(ENTRY_NOT_FOUND);
  }
  const used = await inUse(kind, held);
  if (used) {
    return refused(used);
  }
  await list.remove(id);
  return done(null);
}

/**
 * Deletes a vehicle model that no item uses, with its place in the catalog and its tree.
 * @param id The model.
 * @returns Nothing, or a refusal when the model isn't there or items use it.
 */
export async function removeVehicleModel(id: string): Promise<Result<null>> {
  const held = await prisma.vehicleModel.findUnique({ where: { id }, select: MODEL });
  if (!held) {
    return refused(ENTRY_NOT_FOUND);
  }
  const used = await inUse("vehicleModels", held);
  if (used) {
    return refused(used);
  }
  await prisma.$transaction([prisma.catalogModel.deleteMany({ where: { vehicleModelId: id } }), prisma.vehicleModel.delete({ where: { id } })]);
  return done(null);
}

/**
 * Renames an entry of a list of plain names, with the writing rule applied.
 * @param kind The list.
 * @param id The entry.
 * @param typed The name as typed.
 * @returns The entry renamed, or a refusal when it isn't there or another entry has the name.
 */
export async function renameEntry(kind: NameListKind, id: string, typed: string): Promise<Result<ListEntry>> {
  const list = NAME_LISTS[kind];
  if (!(await list.byId(id))) {
    return refused(ENTRY_NOT_FOUND);
  }
  const name = listName(typed);
  const nameKey = optionKey(name);
  const other = await list.find(nameKey);
  if (other && other.id !== id) {
    return refused(entryConflict("entryTaken", `"${other.name}" is already in the list.`, { entryId: other.id }));
  }
  return done(await list.rename(id, name, nameKey));
}

/**
 * Renames a vehicle model, with the writing rule applied.
 * @param id The model.
 * @param typed The name as typed.
 * @returns The model renamed, or a refusal when it isn't there or another model of its brand has the name.
 */
export async function renameVehicleModel(id: string, typed: string): Promise<Result<VehicleModel>> {
  const held = await prisma.vehicleModel.findUnique({ where: { id }, select: MODEL });
  if (!held) {
    return refused(ENTRY_NOT_FOUND);
  }
  const name = listName(typed);
  const nameKey = optionKey(name);
  const other = await prisma.vehicleModel.findUnique({ where: { brandId_nameKey: { brandId: held.brandId, nameKey } }, select: MODEL });
  if (other && other.id !== id) {
    return refused(entryConflict("modelTaken", `"${other.name}" is already a model of this brand.`, { entryId: other.id }));
  }
  return done(toVehicleModel(await prisma.vehicleModel.update({ where: { id }, data: { name, nameKey }, select: MODEL })));
}

/**
 * Turns a vehicle brand row into the entry the API sends.
 * @param row Vehicle brand row, with its catalog brand if any.
 * @returns The entry, saying whether the catalog has it.
 */
function toBrandEntry(row: { id: string; name: string; catalog: object | null }): ListEntry {
  return { id: row.id, name: row.name, inCatalog: row.catalog !== null };
}

/**
 * Turns a vehicle brand row found by id or name into the entry the API sends.
 * @param row Vehicle brand row, or null when none was found.
 * @returns The entry, or null.
 */
function toFoundBrand(row: { id: string; name: string; catalog: object | null } | null): ListEntry | null {
  return row && toBrandEntry(row);
}

/**
 * Turns a vehicle model row into the model the API sends.
 * @param row Vehicle model row, with its catalog model if any.
 * @returns The model with its vehicle brand's id, saying whether the catalog has it.
 */
function toVehicleModel(row: { id: string; name: string; brandId: string; catalogModel: object | null }): VehicleModel {
  return { id: row.id, name: row.name, vehicleBrandId: row.brandId, inCatalog: row.catalogModel !== null };
}
