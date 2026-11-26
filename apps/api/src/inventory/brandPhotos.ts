import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Item } from "@apc/domain/items";
import { ITEM_PHOTO_LIMIT, PHOTO_PARTS } from "@apc/domain/photos";
import type { ActiveSession } from "../auth/sessions.js";
import { prisma } from "../db/client.js";
import { badRequest, done, notFound, refused, type Rejection, type Result } from "../http/replies.js";
import { ITEM_NOT_FOUND } from "./itemChanges.js";
import { ITEM_INCLUDE, toItem } from "./items.js";
import { checkPhoto, copyStoredPhoto, removePhotoFiles, storePhoto } from "./photos.js";

// The photos of an item's brand, set all at once (PUT /items/:id/brands/:brandId/photos), in the order of the parts
// sent: a "keep" part keeps a saved photo by its id, a "copy" part copies a saved photo of any brand, as a duplicated
// item's do, into a new photo with files of its own, and a "photo" part adds a new file, so one request adds, removes,
// replaces and reorders. Everything sent is checked before anything is stored: at most 3 photos, each new one a JPG,
// PNG or WebP up to 3 MB by its content, each kept one a photo of this brand and each copied one a saved photo. Photos
// left out are deleted with their files. The files go on disk through photos.ts.

/** Refuses a brand that isn't one of the item's. */
const BRAND_NOT_FOUND = notFound("brandNotFound", "Brand not found on this item.");
const uuidSchema = z.uuid();

/** A part of the request, as read: a file with whether it came in cut short, or a field's value. */
export type PhotoPart = { field: string; file: Buffer; truncated: boolean } | { field: string; value: unknown };
/** One photo of the new set: a saved one kept, a saved one copied, or a new file checkPhoto accepted. */
type PhotoEntry = { keep: string } | { copy: string } | { buffer: Buffer };

/**
 * Refuses photos that can't be saved, naming what keeps them from it.
 * @param messages One message per problem, e.g. "Photo 2 is larger than 3 MB."
 * @returns The refusal.
 */
function badPhotos(messages: string[]): Rejection {
  return badRequest("photosInvalid", "The photos can't be saved.", messages.map((message) => ({ field: "photos", message })));
}

/**
 * Tells whether a part's value is a photo id.
 * @param value The value of a form part.
 * @returns True for a UUID.
 */
function isUuid(value: unknown): boolean {
  return uuidSchema.safeParse(value).success;
}

/**
 * Reads the parts sent into the new set of photos, checking each new file and how many there are.
 * @param parts The parts, in order.
 * @returns The photos of the set, and one message per problem found, which keep it from being saved.
 */
async function readPhotoSet(parts: readonly PhotoPart[]): Promise<{ entries: PhotoEntry[]; problems: string[] }> {
  const entries: PhotoEntry[] = [];
  const problems: string[] = [];
  for (const part of parts) {
    const number = entries.length + problems.length + 1;
    if ("file" in part && part.field === PHOTO_PARTS.file) {
      const problem = part.truncated ? "is larger than 3 MB" : await checkPhoto(part.file);
      if (problem) {
        problems.push(`Photo ${number} ${problem}.`);
      } else {
        entries.push({ buffer: part.file });
      }
    } else if ("value" in part && part.field === PHOTO_PARTS.keep && isUuid(part.value)) {
      entries.push({ keep: String(part.value) });
    } else if ("value" in part && part.field === PHOTO_PARTS.copy && isUuid(part.value)) {
      entries.push({ copy: String(part.value) });
    } else {
      problems.push(`Part ${number} is neither a "${PHOTO_PARTS.keep}" or "${PHOTO_PARTS.copy}" photo id nor a "${PHOTO_PARTS.file}" file.`);
    }
  }
  if (entries.length + problems.length > ITEM_PHOTO_LIMIT) {
    problems.push(`A brand of an item holds at most ${ITEM_PHOTO_LIMIT} photos.`);
  }
  return { entries, problems };
}

/**
 * Sets the photos of an item's brand to the set the parts send, storing the new files first and deleting the files of
 * the photos left out once the set is saved; the new files are deleted again when saving the set fails.
 * @param itemId The item.
 * @param brandId The item's brand.
 * @param parts The parts sent, in order.
 * @param session The caller's session, which the item's photo paths are signed for.
 * @returns The item as saved, or a refusal when the set breaks the rules, or the item or its brand isn't there.
 */
export async function replaceBrandPhotos(itemId: string, brandId: string, parts: readonly PhotoPart[], session: ActiveSession): Promise<Result<Item>> {
  const { entries, problems } = await readPhotoSet(parts);
  if (problems.length > 0) {
    return refused(badPhotos(problems));
  }
  if (!(await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } }))) {
    return refused(ITEM_NOT_FOUND);
  }
  const brand = await prisma.itemBrand.findFirst({ where: { id: brandId, itemId }, include: { photos: true } });
  if (!brand) {
    return refused(BRAND_NOT_FOUND);
  }
  const saved = new Map(brand.photos.map((photo) => [photo.id, photo]));
  const kept = entries.flatMap((entry) => ("keep" in entry ? [entry.keep] : []));
  if (kept.some((photoId) => !saved.has(photoId)) || new Set(kept).size < kept.length) {
    return refused(badPhotos(["Kept photos must be this brand's photos, each kept once."]));
  }
  const copied = entries.flatMap((entry) => ("copy" in entry ? [entry.copy] : []));
  const sources = new Map((await prisma.itemPhoto.findMany({ where: { id: { in: copied } } })).map((photo) => [photo.id, photo]));
  if (copied.some((photoId) => !sources.has(photoId))) {
    return refused(badPhotos(["Copied photos must be saved photos."]));
  }

  const photos = await Promise.all(
    entries.map(async (entry) => {
      if ("keep" in entry) {
        return saved.get(entry.keep)!;
      }
      const photoId = randomUUID();
      if ("copy" in entry) {
        return { id: photoId, ...(await copyStoredPhoto(photoId, sources.get(entry.copy)!)) };
      }
      return { id: photoId, ...(await storePhoto(photoId, entry.buffer)) };
    }),
  );
  const added = photos.filter((photo) => !saved.has(photo.id));
  try {
    await prisma.$transaction([
      prisma.itemPhoto.deleteMany({ where: { brandId } }),
      prisma.itemPhoto.createMany({
        data: photos.map(({ id: photoId, file, thumbFile }, position) => ({ id: photoId, brandId, position, file, thumbFile })),
      }),
    ]);
  } catch (error) {
    await removePhotoFiles(added.flatMap((photo) => [photo.file, photo.thumbFile]));
    throw error;
  }
  await removePhotoFiles(brand.photos.filter((photo) => !kept.includes(photo.id)).flatMap((photo) => [photo.file, photo.thumbFile]));
  return done(toItem((await prisma.item.findUnique({ where: { id: itemId }, include: ITEM_INCLUDE }))!, session));
}
