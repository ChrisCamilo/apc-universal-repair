import {
  capitalizeFirst,
  codeKey,
  includeBoth,
  NOT_APPLICABLE,
  searchKey,
  type Item,
  type ItemBrandCreate,
  type ItemCreate,
  type ItemListQuery,
  type ItemUpdate,
  type SortableItem,
} from "@apc/shared/items";
import { splitVehicleModel } from "@apc/shared/item-filters";
import type { Position, Prisma, Side } from "../generated/prisma/client.js";
import { photoOf } from "../photos/photos.js";
import type { ActiveSession } from "../sessions/sessions.js";

// Translates between the items API and the database: the writing rule and search keys applied on create and
// update, the filters of the list, and the row sent back with its brands and their photos. The API speaks names and
// the inventory's own position and side values ("D", "LE"); the database keeps references to the lists' entries (see
// listIds) and enums, so the item comes back with the names its entries have. An item's brands keep the order they
// were sent in, by their position; the item's quantity is their sum (see syncQuantity), so the list filters by stock
// on the item.

/** The order of an item's brands: by their position, the cover's first. */
export const BRAND_ORDER = [{ position: "asc" }, { id: "asc" }] satisfies Prisma.ItemBrandOrderByWithRelationInput[];
/** What every item query includes: the names of its list entries, and its brands with their photos, in order. */
export const ITEM_INCLUDE = {
  category: { select: { name: true } },
  vehicleBrand: { select: { name: true } },
  vehicleModel: { select: { name: true } },
  brands: { orderBy: BRAND_ORDER, include: { partBrand: { select: { name: true } }, photos: { orderBy: { position: "asc" } } } },
} satisfies Prisma.ItemInclude;
/** The database's position for each position the API speaks. */
export const POSITION_VALUES: Record<Item["position"], Position> = { "N/A": "NA", D: "FRONT", T: "REAR", Ambos: "BOTH" };
/** The database's side for each side the API speaks. */
export const SIDE_VALUES: Record<Item["side"], Side> = { "N/A": "NA", LD: "RIGHT", LE: "LEFT", Ambos: "BOTH" };
/** What sortItems looks at, read for every matching item before a sorted page is loaded. */
export const SORT_SELECT = {
  id: true,
  name: true,
  category: { select: { name: true } },
  vehicleBrand: { select: { name: true } },
  vehicleModel: { select: { name: true } },
  position: true,
  side: true,
  quantity: true,
  brands: {
    orderBy: BRAND_ORDER,
    select: { code: true, partBrand: { select: { name: true } }, color: true, location: true, unitPriceCents: true },
  },
} satisfies Prisma.ItemSelect;

/** An item row with what ITEM_INCLUDE reads. */
type ItemRow = Prisma.ItemGetPayload<{ include: typeof ITEM_INCLUDE }>;
/** The references of an item to its list entries, as listIds finds them. */
export type ListIds = { categoryId: string; vehicleBrandId: string; vehicleModelId: string | null };

/**
 * Builds the row of a brand of an item: the code uppercase with its search key, the part brand referenced, and the
 * color N/A when empty.
 * @param input A brand as sent.
 * @param partBrandId Its part brand's entry, from listIds.
 * @param position Its place among the item's brands, from 0.
 * @returns Data for prisma.itemBrand.create or update, without the item.
 */
export function brandData(input: ItemBrandCreate, partBrandId: string, position: number) {
  const code = input.code.trim().toUpperCase();
  return {
    partBrandId,
    position,
    code,
    codeKey: codeKey(code),
    color: textOrNull(input.color) ?? NOT_APPLICABLE,
    location: textOrNull(input.location),
    quantity: input.quantity ?? 0,
    unitPriceCents: input.unitPriceCents,
  };
}

/**
 * Builds the row of a new item, without its brands: text values start with a capital, the search key is filled in,
 * the list entries are referenced, and position and side default to N/A.
 * @param input Validated create body.
 * @param ids The item's list entries, from listIds.
 * @returns Data for prisma.item.create, its quantity the brands' sum.
 */
export function createData(input: ItemCreate, ids: ListIds): Prisma.ItemUncheckedCreateInput {
  const name = capitalizeFirst(input.name);
  return {
    name,
    nameKey: searchKey(name),
    ...ids,
    position: POSITION_VALUES[input.position ?? NOT_APPLICABLE],
    side: SIDE_VALUES[input.side ?? NOT_APPLICABLE],
    quantity: input.brands.reduce((sum, brand) => sum + (brand.quantity ?? 0), 0),
    minQuantity: input.minQuantity ?? 0,
  };
}

/**
 * Builds the list filter: the search matches the name or any brand's part code, every other filter matches any of
 * its values (with "Ambos" fitting a specific position or side, a vehicle model matching with its brand, and a part
 * brand, color or location matching an item when any of its brands has it), and the status compares the brands'
 * quantity with the item's own minimum.
 * @param query Validated list query.
 * @param minQuantity Reference to the minQuantity column, for comparing two columns of the same row.
 * @returns The where clause for prisma.item.findMany.
 */
export function itemWhere(query: ItemListQuery, minQuantity: Prisma.FieldRef<"Item", "Int">): Prisma.ItemWhereInput {
  const and: Prisma.ItemWhereInput[] = [];
  if (query.q) {
    const byCode = codeKey(query.q);
    and.push({
      OR: [{ nameKey: { contains: searchKey(query.q) } }, ...(byCode ? [{ brands: { some: { codeKey: { contains: byCode } } } }] : [])],
    });
  }
  for (const [entry, names] of [
    ["category", query.category],
    ["vehicleBrand", query.vehicleBrand],
  ] as const) {
    if (names.length > 0) {
      and.push({ [entry]: { name: { in: names } } });
    }
  }
  if (query.partBrand.length > 0) {
    and.push({ brands: { some: { partBrand: { name: { in: query.partBrand } } } } });
  }
  /** Turns position or side values into the database's, leaving out unknown ones, which match nothing. */
  const valuesOf = <Value>(values: string[], map: Record<string, Value>) => values.flatMap((value) => map[value] ?? []);
  if (query.position.length > 0) {
    and.push({ position: { in: valuesOf(includeBoth(query.position, ["D", "T"]), POSITION_VALUES) } });
  }
  if (query.side.length > 0) {
    and.push({ side: { in: valuesOf(includeBoth(query.side, ["LD", "LE"]), SIDE_VALUES) } });
  }
  for (const field of ["color", "location"] as const) {
    if (query[field].length > 0) {
      and.push({ brands: { some: { [field]: { in: query[field] } } } });
    }
  }
  const models = query.vehicleModel.flatMap((value) => splitVehicleModel(value) ?? []);
  if (models.length > 0) {
    and.push({
      OR: models.map((pair) => ({ vehicleBrand: { name: pair.vehicleBrand }, vehicleModel: { name: pair.vehicleModel } })),
    });
  }
  if (query.status === "out") {
    and.push({ quantity: 0 });
  } else if (query.status === "low") {
    and.push({ quantity: { gt: 0 } }, { quantity: { lte: minQuantity } });
  }
  return { AND: and };
}

/**
 * Finds the position or side the API speaks for one the database keeps.
 * @param values POSITION_VALUES or SIDE_VALUES.
 * @param value The database's value.
 * @returns The API's value, e.g. "D" for FRONT.
 */
function labelOf<Label extends string, Value extends string>(values: Record<Label, Value>, value: Value): Label {
  return (Object.keys(values) as Label[]).find((label) => values[label] === value)!;
}

/**
 * Adds up an item's brands' quantities into the item's, after its brands changed, in the same transaction.
 * @param tx Database client, in the transaction that changed the brands.
 * @param itemId The item.
 */
export async function syncQuantity(tx: Prisma.TransactionClient, itemId: string): Promise<void> {
  const { _sum } = await tx.itemBrand.aggregate({ where: { itemId }, _sum: { quantity: true } });
  await tx.item.update({ where: { id: itemId }, data: { quantity: _sum.quantity ?? 0 } });
}

/**
 * Reduces an optional text to what is saved: the written text, or null when empty.
 * @param value Text as received, possibly missing or blank.
 * @returns The text with a capital first letter, or null.
 */
function textOrNull(value: string | undefined): string | null {
  return value?.trim() ? capitalizeFirst(value) : null;
}

/**
 * Turns a database row into the item the API sends, without the search keys, with its list entries' names, its
 * position and side as the API speaks them, and its brands with their photos in order, at paths signed for the caller.
 * @param row Item row, read with ITEM_INCLUDE.
 * @param session The caller's session.
 * @returns The item as described by itemSchema.
 */
export function toItem(row: ItemRow, session: ActiveSession): Item {
  return {
    id: row.id,
    name: row.name,
    category: row.category.name,
    vehicleBrand: row.vehicleBrand.name,
    vehicleModel: row.vehicleModel?.name ?? null,
    position: labelOf(POSITION_VALUES, row.position),
    side: labelOf(SIDE_VALUES, row.side),
    quantity: row.quantity,
    minQuantity: row.minQuantity,
    brands: row.brands.map((brand) => ({
      id: brand.id,
      partBrand: brand.partBrand.name,
      code: brand.code,
      color: brand.color,
      location: brand.location,
      quantity: brand.quantity,
      unitPriceCents: brand.unitPriceCents,
      photos: brand.photos.map((photo) => photoOf(photo, session)),
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Turns a row read with SORT_SELECT into what sortItems looks at, as sortableOf reads an item: the first brand's
 * code, part brand, color and location, and the lowest price.
 * @param row The row.
 * @returns The item's id and what it sorts by, with names and the position and side as the API speaks them.
 */
export function toSortable(row: Prisma.ItemGetPayload<{ select: typeof SORT_SELECT }>): SortableItem & { id: string } {
  const [first] = row.brands;
  return {
    id: row.id,
    name: row.name,
    category: row.category.name,
    vehicleBrand: row.vehicleBrand.name,
    vehicleModel: row.vehicleModel?.name ?? null,
    position: labelOf(POSITION_VALUES, row.position),
    side: labelOf(SIDE_VALUES, row.side),
    quantity: row.quantity,
    code: first.code,
    partBrand: first.partBrand.name,
    color: first.color,
    location: first.location,
    unitPriceCents: Math.min(...row.brands.map((brand) => brand.unitPriceCents)),
  };
}

/**
 * Builds the changes of an edit to the item's own fields with the same rules as createData, for the fields that came
 * in; its brands change apart (see the items routes).
 * @param input Validated update body.
 * @param ids The list entries that changed, from listIds.
 * @returns Data for prisma.item.update.
 */
export function updateData(input: ItemUpdate, ids: Partial<ListIds>): Prisma.ItemUncheckedUpdateInput {
  const data: Prisma.ItemUncheckedUpdateInput = { ...ids };
  if (input.name !== undefined) {
    data.name = capitalizeFirst(input.name);
    data.nameKey = searchKey(data.name);
  }
  if (input.position !== undefined) {
    data.position = POSITION_VALUES[input.position];
  }
  if (input.side !== undefined) {
    data.side = SIDE_VALUES[input.side];
  }
  if (input.minQuantity !== undefined) {
    data.minQuantity = input.minQuantity;
  }
  return data;
}
