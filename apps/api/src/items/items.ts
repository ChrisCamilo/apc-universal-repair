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
} from "@apc/shared/items";
import { splitVehicleModel } from "@apc/shared/item-filters";
import type { Item as ItemRow, ItemPhoto as ItemPhotoRow, Prisma } from "../generated/prisma/client.js";
import { photoOf } from "../photos/photos.js";

// Translates between the items API and the database: the writing rule and search keys applied on create and
// update, the filters of the list, and the row sent back with its photos.

/** What every item query includes: the item's photos, in order. */
export const WITH_PHOTOS = { photos: { orderBy: { position: "asc" } } } satisfies Prisma.ItemInclude;

/**
 * Builds the row of a new item: text values start with a capital, the code is uppercase, the search keys are
 * filled in and position, side and color default to N/A.
 * @param input Validated create body.
 * @returns Data for prisma.item.create.
 */
export function createData(input: ItemCreate): Prisma.ItemCreateInput {
  const code = input.code.trim().toUpperCase();
  const name = capitalizeFirst(input.name);
  return {
    code,
    codeKey: codeKey(code),
    name,
    nameKey: searchKey(name),
    category: capitalizeFirst(input.category),
    partBrand: capitalizeFirst(input.partBrand),
    vehicleBrand: capitalizeFirst(input.vehicleBrand),
    vehicleModel: textOrNull(input.vehicleModel),
    position: input.position ?? NOT_APPLICABLE,
    side: input.side ?? NOT_APPLICABLE,
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
  const lists: [keyof Prisma.ItemWhereInput, string[]][] = [
    ["category", query.category],
    ["partBrand", query.partBrand],
    ["vehicleBrand", query.vehicleBrand],
    ["position", includeBoth(query.position, ["D", "T"])],
    ["side", includeBoth(query.side, ["LD", "LE"])],
    ["color", query.color],
    ["location", query.location],
  ];
  for (const [field, values] of lists) {
    if (values.length > 0) {
      and.push({ [field]: { in: values } });
    }
  }
  const models = query.vehicleModel.flatMap((value) => splitVehicleModel(value) ?? []);
  if (models.length > 0) {
    and.push({ OR: models });
  }
  if (query.status === "out") {
    and.push({ quantity: 0 });
  } else if (query.status === "low") {
    and.push({ quantity: { gt: 0 } }, { quantity: { lte: minQuantity } });
  }
  return { AND: and };
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
 * Turns a database row into the item the API sends, without the search keys, with its photos in order.
 * @param row Item row, read with WITH_PHOTOS.
 * @returns The item as described by itemSchema.
 */
export function toItem(row: ItemRow & { photos: ItemPhotoRow[] }): Item {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    partBrand: row.partBrand,
    vehicleBrand: row.vehicleBrand,
    vehicleModel: row.vehicleModel,
    position: row.position as Item["position"],
    side: row.side as Item["side"],
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
 * Builds the changes of an edit with the same rules as createData, for the fields that came in.
 * @param input Validated update body.
 * @returns Data for prisma.item.update.
 */
export function updateData(input: ItemUpdate): Prisma.ItemUpdateInput {
  const data: Prisma.ItemUpdateInput = {};
  if (input.code !== undefined) {
    data.code = input.code.trim().toUpperCase();
    data.codeKey = codeKey(data.code);
  }
  if (input.name !== undefined) {
    data.name = capitalizeFirst(input.name);
    data.nameKey = searchKey(data.name);
  }
  for (const field of ["category", "partBrand", "vehicleBrand"] as const) {
    if (input[field] !== undefined) {
      data[field] = capitalizeFirst(input[field]);
    }
  }
  if (input.vehicleModel !== undefined) {
    data.vehicleModel = textOrNull(input.vehicleModel);
  }
  if (input.location !== undefined) {
    data.location = textOrNull(input.location);
  }
  if (input.color !== undefined) {
    data.color = textOrNull(input.color) ?? NOT_APPLICABLE;
  }
  for (const field of ["position", "side", "quantity", "minQuantity", "unitPriceCents"] as const) {
    if (input[field] !== undefined) {
      Object.assign(data, { [field]: input[field] });
    }
  }
  return data;
}
