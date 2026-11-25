import { codeKey, MAX_QUANTITY, optionKey, type ItemBrandCreate, type ItemCreate, type ItemUpdate } from "@apc/domain/items";
import type { Prisma } from "../generated/prisma/client.js";
import { badRequest, conflict, notFound, refused, type Rejection } from "../http/replies.js";
import { brandData, createData, ITEM_INCLUDE, originalCodesData, syncQuantity, updateData, vehiclesData, type ListIds } from "./items.js";
import { listIds } from "./listIds.js";

// The changes to an item, as the item routes and a phone's batch of operations (POST /sync/operations) make them, with
// the same rules: saving an item adds the names its lists don't hold yet (see listIds); a code, a brand's or an item's
// original one, is unique across the stock as the search compares it (see codeKey), so "CB4500" is "CB-4500": a code
// another item uses is refused with 409, naming that item and the code, and one used twice in the item with 400. An
// edit that sends original codes, or vehicles, sends the whole new list. An edit that sends brands sends the whole new
// set: a brand with its id is kept and changed, one without is added, and one left out is deleted with its photos'
// files; an item keeps at least one. A brand kept without a quantity keeps its own, as a phone sends its stock as moves.
// A phone's edit may add a brand with the id it gave it, refused with 409 when a brand already has it. The item's
// quantity is its brands' sum. A stock move adds to a brand's quantity,
// which stops at 0. Each change runs on the client it is given, in a transaction the caller opens, and answers the item
// as saved, or why it was refused, as the route answers it; the photo files a change leaves behind are removed by the
// caller once the transaction is in.

/** What a change gave: the item as saved, with the photo files it left behind, or why it was refused. */
export type ItemChange<Value> = { ok: true; value: Value; files: string[] } | { ok: false; rejection: Rejection };
/** An item row with what ITEM_INCLUDE reads. */
export type ItemRow = Prisma.ItemGetPayload<{ include: typeof ITEM_INCLUDE }>;
/** A code sent, with the field of the request it came in, e.g. "brands/0/code" or "originalCodes/1". */
type SentCode = { code: string; field: string };

/** Refuses an item id that doesn't exist. */
export const ITEM_NOT_FOUND = notFound("Item not found.");
/** Refuses a brand sent with the id of a brand that isn't the item's. */
const FOREIGN_BRAND = badRequest("A brand sent with an id must be one of this item's.");
/** Refuses an id a phone gave an item or a brand that another one already has. */
export const ID_TAKEN = conflict("The id of the item or of one of its brands is already taken.");

/**
 * Refuses a code an item would hold twice, as an original code and a brand's.
 * @param code The code.
 * @returns Why.
 */
function codeRepeated(code: string): Rejection {
  return badRequest(`Code "${code}" is repeated in the item.`);
}

/**
 * Refuses a code another item already uses.
 * @param taken The code that clashes, its field in the request and the item that uses it.
 * @returns Why, naming the item, so the form can say which.
 */
function codeTaken(taken: SentCode & { owner: { id: string; name: string } }): Rejection {
  const message = `Code "${taken.code}" is already used by "${taken.owner.name}".`;
  return conflict(message, [{ field: taken.field, message, code: taken.code, itemId: taken.owner.id, itemName: taken.owner.name }]);
}

/**
 * Finds the first code sent that another item uses, as a brand's code or an original one.
 * @param db Database client.
 * @param codes The codes sent, in the request's order.
 * @param itemId The item they belong to, which may keep its own codes.
 * @returns The code, its field and the item that uses it, or undefined when every code is free.
 */
async function findTakenCode(db: Prisma.TransactionClient, codes: readonly SentCode[], itemId?: string) {
  const sent = codes.map((each) => ({ ...each, code: each.code.trim().toUpperCase() }));
  const where = { codeKey: { in: sent.map((each) => codeKey(each.code)) }, ...(itemId && { itemId: { not: itemId } }) };
  const select = { codeKey: true, item: { select: { id: true, name: true } } };
  const held = [...(await db.itemBrand.findMany({ where, select })), ...(await db.itemOriginalCode.findMany({ where, select }))];
  const taken = sent.find((each) => held.some((row) => row.codeKey === codeKey(each.code)));
  return taken && { ...taken, owner: held.find((row) => row.codeKey === codeKey(taken.code))!.item };
}

/**
 * Finds a code an item would hold twice, among its original codes and its brands' codes together.
 * @param codes Every code the item would hold.
 * @returns The first code repeated, or undefined.
 */
function repeatedCode(codes: readonly string[]): string | undefined {
  return codes.find((code, index) => codes.slice(0, index).some((other) => codeKey(other) === codeKey(code)));
}

/**
 * Lists the codes of a request, with their fields: its brands' and its original ones.
 * @param body The create or edit body.
 * @returns Each code sent with its field.
 */
function sentCodes(body: { brands?: readonly { code: string }[]; originalCodes?: readonly string[] }): SentCode[] {
  return [
    ...(body.brands ?? []).map((brand, index) => ({ code: brand.code, field: `brands/${index}/code` })),
    ...(body.originalCodes ?? []).map((code, index) => ({ code, field: `originalCodes/${index}` })),
  ];
}

/**
 * Saves an item's new set of brands: the ones left out are deleted, the item's ones changed, keeping their quantity
 * when sent without one, and the others added, with the id a phone gave them, each at its place in the set; the item's
 * quantity becomes their sum.
 * @param tx Database client, in the edit's transaction.
 * @param itemId The item.
 * @param brands The whole new set, as sent.
 * @param heldIds The item's brands before the edit.
 */
async function saveBrands(tx: Prisma.TransactionClient, itemId: string, brands: readonly ItemBrandCreate[], heldIds: readonly string[]) {
  const kept = new Set(brands.flatMap((brand) => (brand.id ? [brand.id] : [])));
  await tx.itemBrand.deleteMany({ where: { itemId, id: { in: heldIds.filter((id) => !kept.has(id)) } } });
  for (const [position, brand] of brands.entries()) {
    const data = brandData(brand, (await listIds(tx, { partBrand: brand.partBrand })).partBrandId!, position);
    if (brand.id && heldIds.includes(brand.id)) {
      const { quantity, ...rest } = data;
      await tx.itemBrand.update({ where: { id: brand.id }, data: brand.quantity === undefined ? rest : { ...rest, quantity } });
    } else {
      await tx.itemBrand.create({ data: { ...data, itemId, ...(brand.id && { id: brand.id }) } });
    }
  }
  await syncQuantity(tx, itemId);
}

/**
 * Creates an item with its vehicles, original codes and brands.
 * @param tx Database client, in a transaction.
 * @param body The item as sent.
 * @param ids The ids a phone gave the item and its brands, kept as they are; without them, the database makes them.
 * @returns The item as saved, or why it was refused.
 */
export async function createItem(tx: Prisma.TransactionClient, body: ItemCreate, ids: { itemId?: string } = {}): Promise<ItemChange<ItemRow>> {
  const taken = await findTakenCode(tx, sentCodes(body));
  if (taken) {
    return refused(codeTaken(taken));
  }
  const brands = [];
  for (const [position, brand] of body.brands.entries()) {
    const data = brandData(brand, (await listIds(tx, { partBrand: brand.partBrand })).partBrandId!, position);
    brands.push(ids.itemId && brand.id ? { ...data, id: brand.id } : data);
  }
  const listed = (await listIds(tx, body)) as ListIds;
  const row = await tx.item.create({
    data: {
      ...createData(body, listed),
      ...(ids.itemId && { id: ids.itemId }),
      vehicles: { create: await vehiclesData(tx, body.vehicles) },
      originalCodes: { create: originalCodesData(body.originalCodes ?? []) },
      brands: { create: brands },
    },
    include: ITEM_INCLUDE,
  });
  return { ok: true, value: row, files: [] };
}

/**
 * Changes an item: the fields sent, and the whole lists of vehicles, original codes and brands when sent.
 * @param tx Database client, in a transaction.
 * @param id The item.
 * @param body The edit as sent.
 * @param ids Whether a brand may come with an id the phone gave it, which it is added with; otherwise a brand's id must
 * be one of the item's.
 * @returns The item as saved, with the files of the photos of the brands it deleted, or why it was refused.
 */
export async function updateItem(
  tx: Prisma.TransactionClient,
  id: string,
  body: ItemUpdate,
  ids: { newBrandIds?: boolean } = {},
): Promise<ItemChange<ItemRow>> {
  const held = await tx.item.findUnique({
    where: { id },
    select: { originalCodes: { select: { code: true } }, brands: { select: { id: true, code: true, photos: true } } },
  });
  if (!held) {
    return refused(ITEM_NOT_FOUND);
  }
  const { brands, originalCodes, vehicles } = body;
  const heldIds = held.brands.map((brand) => brand.id);
  const newIds = (brands ?? []).flatMap((brand) => (brand.id && !heldIds.includes(brand.id) ? [brand.id] : []));
  if (newIds.length > 0 && !ids.newBrandIds) {
    return refused(FOREIGN_BRAND);
  }
  if (newIds.length > 0 && (await tx.itemBrand.count({ where: { id: { in: newIds } } })) > 0) {
    return refused(ID_TAKEN);
  }
  // The codes the item holds after the edit: the ones sent, or the ones it keeps.
  const repeated = repeatedCode([
    ...(brands ?? held.brands).map((brand) => brand.code),
    ...(originalCodes ?? held.originalCodes.map((original) => original.code)),
  ]);
  if (repeated) {
    return refused(codeRepeated(repeated));
  }
  // A phone's edit merged with a brand added here may name a part brand twice, which the schema can't see.
  const partBrands = (brands ?? []).map((brand) => optionKey(brand.partBrand));
  const partBrand = (brands ?? []).find((_, index) => partBrands.indexOf(partBrands[index]) !== index);
  if (partBrand) {
    return refused(badRequest(`Part brand "${partBrand.partBrand}" is repeated in the item.`));
  }
  const taken = await findTakenCode(tx, sentCodes(body), id);
  if (taken) {
    return refused(codeTaken(taken));
  }
  await tx.item.update({ where: { id }, data: updateData(body, await listIds(tx, body)) });
  if (vehicles) {
    const data = await vehiclesData(tx, vehicles);
    await tx.itemVehicle.deleteMany({ where: { itemId: id } });
    await tx.itemVehicle.createMany({ data: data.map((each) => ({ ...each, itemId: id })) });
  }
  if (originalCodes) {
    await tx.itemOriginalCode.deleteMany({ where: { itemId: id } });
    await tx.itemOriginalCode.createMany({ data: originalCodesData(originalCodes).map((data) => ({ ...data, itemId: id })) });
  }
  if (brands) {
    await saveBrands(tx, id, brands, heldIds);
  }
  const row = await tx.item.findUniqueOrThrow({ where: { id }, include: ITEM_INCLUDE });
  const kept = new Set(row.brands.map((brand) => brand.id));
  const files = held.brands.filter((brand) => !kept.has(brand.id)).flatMap((brand) => brand.photos.flatMap((photo) => [photo.file, photo.thumbFile]));
  return { ok: true, value: row, files };
}

/**
 * Deletes an item, with its brands and their photos.
 * @param tx Database client, in a transaction.
 * @param id The item.
 * @returns The files of its photos, or why it was refused.
 */
export async function deleteItem(tx: Prisma.TransactionClient, id: string): Promise<ItemChange<null>> {
  const photos = await tx.itemPhoto.findMany({ where: { brand: { itemId: id } } });
  const { count } = await tx.item.deleteMany({ where: { id } });
  if (count === 0) {
    return refused(ITEM_NOT_FOUND);
  }
  return { ok: true, value: null, files: photos.flatMap((photo) => [photo.file, photo.thumbFile]) };
}

/**
 * Adds a stock move to a brand's quantity, stopping at 0, as two phones may each take out the last part, and at
 * MAX_QUANTITY, and makes the item's quantity its brands' sum again.
 * @param tx Database client, in a transaction.
 * @param itemId The item.
 * @param brandId The brand of it whose stock moved.
 * @param delta How many came in (positive) or went out (negative).
 * @returns The item as saved, or why it was refused.
 */
export async function moveStock(tx: Prisma.TransactionClient, itemId: string, brandId: string, delta: number): Promise<ItemChange<ItemRow>> {
  const { count } = await tx.itemBrand.updateMany({ where: { id: brandId, itemId }, data: { quantity: { increment: delta } } });
  if (count === 0) {
    return refused(ITEM_NOT_FOUND);
  }
  await tx.itemBrand.updateMany({ where: { id: brandId, quantity: { lt: 0 } }, data: { quantity: 0 } });
  await tx.itemBrand.updateMany({ where: { id: brandId, quantity: { gt: MAX_QUANTITY } }, data: { quantity: MAX_QUANTITY } });
  await syncQuantity(tx, itemId);
  return { ok: true, value: await tx.item.findUniqueOrThrow({ where: { id: itemId }, include: ITEM_INCLUDE }), files: [] };
}
