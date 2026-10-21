import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PHOTO_MAX_BYTES, PHOTO_MAX_DIMENSION, PHOTO_QUALITY } from "@apc/shared/photos";
import type { ItemPhoto } from "@apc/shared/items";
import type { ItemPhoto as ItemPhotoRow } from "../generated/prisma/client.js";
import { signedPhotoPath, type ActiveSession } from "../sessions/sessions.js";

// Item photos on disk: each one is checked by its content (JPG, PNG or WebP up to 3 MB, whatever its name says),
// reduced and stored under PHOTOS_DIR as a WebP named after its id, next to a square WebP thumbnail for the list, and
// served back from /photos, at paths signed for the caller's session (see sessions.ts). Reducing turns it upright as the camera meant, fits its longest side in
// PHOTO_MAX_DIMENSION without enlarging it, saves it at PHOTO_QUALITY and drops its metadata (EXIF, location). The
// database row keeps the two file names and the photo's place among the item's photos. A photo copied to another item
// gets files of its own, so deleting either leaves the other's.

/** Formats accepted, by what sharp reads from the file's content. */
const FORMATS = new Set(["jpeg", "png", "webp"]);
/** Side of the square thumbnail, in px: the list shows it at 44px, so this stays sharp on dense screens. */
export const THUMB_SIZE = 176;

/**
 * Tells why a sent file can't be a photo.
 * @param buffer The file's bytes.
 * @returns The problem in words, or null for a JPG, PNG or WebP up to 3 MB.
 */
export async function checkPhoto(buffer: Buffer): Promise<string | null> {
  if (buffer.length > PHOTO_MAX_BYTES) {
    return "is larger than 3 MB";
  }
  const format = await sharp(buffer)
    .metadata()
    .then((metadata) => metadata.format)
    .catch(() => undefined);
  return format && FORMATS.has(format) ? null : "is not a JPG, PNG or WebP image";
}

/**
 * Reduces a photo: upright, its longest side fitted in PHOTO_MAX_DIMENSION (never enlarged), WebP at PHOTO_QUALITY,
 * with no metadata.
 * @param buffer The photo's bytes.
 * @returns The reduced WebP's bytes.
 */
export async function compressPhoto(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize(PHOTO_MAX_DIMENSION, PHOTO_MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: PHOTO_QUALITY })
    .toBuffer();
}

/**
 * Copies a stored photo and its thumbnail into files named after a new photo's id, keeping their extensions.
 * @param id The new photo's id, which names both copies.
 * @param row The names of the stored photo's files.
 * @returns The names of the copied photo and thumbnail.
 */
export async function copyStoredPhoto(id: string, row: Pick<ItemPhotoRow, "file" | "thumbFile">): Promise<{ file: string; thumbFile: string }> {
  const dir = photosDir();
  const file = `${id}${path.extname(row.file)}`;
  const thumbFile = `${id}-thumb${path.extname(row.thumbFile)}`;
  await copyFile(path.join(dir, row.file), path.join(dir, file));
  await copyFile(path.join(dir, row.thumbFile), path.join(dir, thumbFile));
  return { file, thumbFile };
}

/**
 * Turns a photo row into the photo the API sends, with the paths it is served at for the caller.
 * @param row Photo row.
 * @param session The caller's session, which the paths are signed for.
 * @returns The photo as described by itemPhotoSchema.
 */
export function photoOf(row: Pick<ItemPhotoRow, "id" | "file" | "thumbFile">, session: ActiveSession): ItemPhoto {
  return { id: row.id, url: signedPhotoPath(session, row.file), thumbUrl: signedPhotoPath(session, row.thumbFile) };
}

/**
 * The folder photos are stored in: PHOTOS_DIR, or "uploads/photos" under the folder the API runs from.
 * @returns Absolute path of the folder.
 */
export function photosDir(): string {
  return path.resolve(process.env.PHOTOS_DIR ?? "uploads/photos");
}

/**
 * Reduces a photo stored before photos were reduced, the way storePhoto does now, as `<id>.webp`. A photo already
 * reduced (a WebP that fits in PHOTO_MAX_DIMENSION) is left as it is, so running it again changes nothing. The new
 * file is written and saved before the old one is deleted, so the row never points at a missing file.
 * @param row The photo's id and the name of its stored file.
 * @param save Saves the new file name in the photo's row.
 * @returns The new file name, or null when the photo was already reduced.
 */
export async function reduceStoredPhoto(
  row: { id: string; file: string },
  save: (file: string) => Promise<void>,
): Promise<string | null> {
  const dir = photosDir();
  const buffer = await readFile(path.join(dir, row.file));
  const { format, width = 0, height = 0 } = await sharp(buffer).metadata();
  if (format === "webp" && Math.max(width, height) <= PHOTO_MAX_DIMENSION) {
    return null;
  }
  const file = `${row.id}.webp`;
  await writeFile(path.join(dir, file), await compressPhoto(buffer));
  if (file !== row.file) {
    await save(file);
    await rm(path.join(dir, row.file), { force: true });
  }
  return file;
}

/**
 * Deletes the files of photos taken off an item; files already gone are ignored.
 * @param files Names of the files to delete.
 */
export async function removePhotoFiles(files: readonly string[]) {
  await Promise.all(files.map((file) => rm(path.join(photosDir(), file), { force: true })));
}

/**
 * Stores a checked photo reduced by compressPhoto, and its thumbnail made from the reduced photo: a square WebP of
 * THUMB_SIZE, cropped from the middle.
 * @param id The photo's id, which names both files.
 * @param buffer The file's bytes, as sent.
 * @returns The names of the photo and the thumbnail.
 */
export async function storePhoto(id: string, buffer: Buffer): Promise<{ file: string; thumbFile: string }> {
  const dir = photosDir();
  const file = `${id}.webp`;
  const thumbFile = `${id}-thumb.webp`;
  const reduced = await compressPhoto(buffer);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, file), reduced);
  await sharp(reduced).resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" }).webp().toFile(path.join(dir, thumbFile));
  return { file, thumbFile };
}
