import {
  capitalizeFirst,
  codeKey,
  includeBoth,
  NOT_APPLICABLE,
  searchKey,
  type Item,
  type ItemCreate,
  type ItemListQuery,
  type ItemUpdate,
  type SortableItem,
} from "@apc/shared/items";
import { splitVehicleModel } from "@apc/shared/item-filters";
import type { Position, Prisma, Side } from "../generated/prisma/client.js";
import { photoOf } from "../photos/photos.js";

// Translates between the items API and the database: the writing rule and search keys applied on create and
// update, the filters of the list, and the row sent back with its photos. The API speaks names and the inventory's
// own position and side values ("D", "LE"); the database keeps references to the lists' entries (see listIds) and
// enums, so the item comes back with the names its entries have.

/** What every item query includes: the item's photos, in order, and the names of its list entries. */
export const ITEM_INCLUDE = {
  photos: { orderBy: { position: "asc" } },
  category: { select: { name: true } },
  partBrand: { select: { name: true } },
  vehicleBrand: { select: { name: true } },
  vehicleModel: { select: { name: true } },
} satisfies Prisma.ItemInclude;
/** The database's position for each position the API speaks. */
export const POSITION_VALUES: Record<Item["position"], Position> = { "N/A": "NA", D: "FRONT", T: "REAR", Ambos: "BOTH" };
/** The database's side for each side the API speaks. */
export const SIDE_VALUES: Record<Item["side"], Side> = { "N/A": "NA", LD: "RIGHT", LE: "LEFT", Ambos: "BOTH" };
/** What sortItems looks at, read for every matching item before a sorted page is loaded. */
export const SORT_SELECT = {
  id: true,
  code: true,
  name: true,
  category: { select: { name: true } },
  partBrand: { select: { name: true } },
  vehicleBrand: { select: { name: true } },
  vehicleModel: { select: { name: true } },
  position: true,
  side: true,
  color: true,
  location: true,
  unitPriceCents: true,
  quantity: true,
} satisfies Prisma.ItemSelect;

/** An item row with what ITEM_INCLUDE reads. */
type ItemRow = Prisma.ItemGetPayload<{ include: typeof ITEM_INCLUDE }>;
/** The references of an item to its list entries, as listIds finds them. */
export type ListIds = { categoryId: string; partBrandId: string; vehicleBrandId: string; vehicleModelId: string | null };

/**
 * Builds the row of a new item: text values start with a capital, the code is uppercase, the search keys are
 * filled in, the list entries are referenced, and position, side and color default to N/A.
 * @param input Validated create body.
 * @param ids The item's list entries, from listIds.
 * @returns Data for prisma.item.create.
 */
export function createData(input: ItemCreate, ids: ListIds): Prisma.ItemUncheckedCreateInput {
  const code = input.code.trim().toUpperCase();
  const name = capitalizeFirst(input.name);
  return {
    code,
    codeKey: codeKey(code),
    name,
    nameKey: searchKey(name),
    ...ids,
    position: POSITION_VALUES[input.position ?? NOT_APPLICABLE],
    side: SIDE_VALUES[input.side ?? NOT_APPLICABLE],
    color: textOrNull(input.color) ?? NOT_APPLICABLE,
    location: textOrNull(input.location),
    quantity: input.quantity ?? 0,
    minQuantity: input.minQuantity ?? 0,
    unitPriceCents: input.unitPriceCents,
  };
}

/**
 * Builds the list filter: the search matches the name or the part code, every other filter matches any of
 * its values (with "Ambos" fitting a specific position or side, and a vehicle model matching with its brand), and
 * the status compares the quantity with the item's own minimum.
 * @param query Validated list query.
 * @param minQuantity Reference to the minQuantity column, for comparing two columns of the same row.
 * @returns The where clause for prisma.item.findMany.
 */
export function itemWhere(query: ItemListQuery, minQuantity: Prisma.FieldRef<"Item", "Int">): Prisma.ItemWhereInput {
  const and: Prisma.ItemWhereInput[] = [];
  if (query.q) {
    const byCode = codeKey(query.q);
    and.push({
      OR: [{ nameKey: { contains: searchKey(query.q) } }, ...(byCode ? [{ codeKey: { contains: byCode } }] : [])],
    });
  }
  const named: ["category" | "partBrand" | "vehicleBrand", string[]][] = [
    ["category", query.category],
    ["partBrand", query.partBrand],
    ["vehicleBrand", query.vehicleBrand],
  ];
  for (const [entry, names] of named) {
    if (names.length > 0) {
      and.push({ [entry]: { name: { in: names } } });
    }
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
      and.push({ [field]: { in: query[field] } });
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
 * Reduces an optional text to what is saved: the written text, or null when empty.
 * @param value Text as received, possibly missing or blank.
 * @returns The text with a capital first letter, or null.
 */
function textOrNull(value: string | undefined): string | null {
  return value?.trim() ? capitalizeFirst(value) : null;
}

/**
 * Turns a database row into the item the API sends, without the search keys, with its list entries' names, its
 * position and side as the API speaks them, and its photos in order.
 * @param row Item row, read with ITEM_INCLUDE.
 * @returns The item as described by itemSchema.
 */
export function toItem(row: ItemRow): Item {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category.name,
    partBrand: row.partBrand.name,
    vehicleBrand: row.vehicleBrand.name,
    vehicleModel: row.vehicleModel?.name ?? null,
    position: labelOf(POSITION_VALUES, row.position),
    side: labelOf(SIDE_VALUES, row.side),
    color: row.color,
    location: row.location,
    quantity: row.quantity,
    minQuantity: row.minQuantity,
    unitPriceCents: row.unitPriceCents,
    photos: row.photos.map(photoOf),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Turns a row read with SORT_SELECT into what sortItems looks at.
 * @param row The row.
 * @returns The item's id and what it sorts by, with names and the position and side as the API speaks them.
 */
export function toSortable(row: Prisma.ItemGetPayload<{ select: typeof SORT_SELECT }>): SortableItem & { id: string } {
  return {
    ...row,
    category: row.category.name,
    partBrand: row.partBrand.name,
    vehicleBrand: row.vehicleBrand.name,
    vehicleModel: row.vehicleModel?.name ?? null,
    position: labelOf(POSITION_VALUES, row.position),
    side: labelOf(SIDE_VALUES, row.side),
  };
}

/**
 * Builds the changes of an edit with the same rules as createData, for the fields that came in.
 * @param input Validated update body.
 * @param ids The list entries that changed, from listIds.
 * @returns Data for prisma.item.update.
 */
export function updateData(input: ItemUpdate, ids: Partial<ListIds>): Prisma.ItemUncheckedUpdateInput {
  const data: Prisma.ItemUncheckedUpdateInput = { ...ids };
  if (input.code !== undefined) {
    data.code = input.code.trim().toUpperCase();
    data.codeKey = codeKey(data.code);
  }
  if (input.name !== undefined) {
    data.name = capitalizeFirst(input.name);
    data.nameKey = searchKey(data.name);
  }
  if (input.location !== undefined) {
    data.location = textOrNull(input.location);
  }
  if (input.color !== undefined) {
    data.color = textOrNull(input.color) ?? NOT_APPLICABLE;
  }
  if (input.position !== undefined) {
    data.position = POSITION_VALUES[input.position];
  }
  if (input.side !== undefined) {
    data.side = SIDE_VALUES[input.side];
  }
  for (const field of ["quantity", "minQuantity", "unitPriceCents"] as const) {
    if (input[field] !== undefined) {
      data[field] = input[field];
    }
  }
  return data;
}
