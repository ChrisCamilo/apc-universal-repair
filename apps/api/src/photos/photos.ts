import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PHOTO_MAX_BYTES } from "@apc/shared/photos";
import type { ItemPhoto } from "@apc/shared/items";
import type { ItemPhoto as ItemPhotoRow } from "../generated/prisma/client.js";

// Item photos on disk: each one is checked by its content (JPG, PNG or WebP up to 3 MB, whatever its name says),
// stored as sent under PHOTOS_DIR, named after its id, next to a square WebP thumbnail for the list, and served
// back from /photos. The database row keeps the two file names and the photo's place among the item's photos.

/** Extension each accepted format is stored with. */
const EXTENSIONS: Record<string, PhotoExtension> = { jpeg: "jpg", png: "png", webp: "webp" };
/** Side of the square thumbnail, in px: the list shows it at 44px, so this stays sharp on dense screens. */
export const THUMB_SIZE = 176;

type PhotoExtension = "jpg" | "png" | "webp";

/**
 * Tells what a sent file is: an accepted photo and the extension to store it with, or why it isn't one.
 * @param buffer The file's bytes.
 * @returns The extension, or the problem in words.
 */
export async function checkPhoto(buffer: Buffer): Promise<{ ext: PhotoExtension } | { problem: string }> {
  if (buffer.length > PHOTO_MAX_BYTES) {
    return { problem: "is larger than 3 MB" };
  }
  const format = await sharp(buffer)
    .metadata()
    .then((metadata) => metadata.format)
    .catch(() => undefined);
  const ext = format && EXTENSIONS[format];
  return ext ? { ext } : { problem: "is not a JPG, PNG or WebP image" };
}

/**
 * Turns a photo row into the photo the API sends, with the paths it is served at.
 * @param row Photo row.
 * @returns The photo as described by itemPhotoSchema.
 */
export function photoOf(row: Pick<ItemPhotoRow, "id" | "file" | "thumbFile">): ItemPhoto {
  return { id: row.id, url: `/photos/${row.file}`, thumbUrl: `/photos/${row.thumbFile}` };
}

/**
 * The folder photos are stored in: PHOTOS_DIR, or "uploads/photos" under the folder the API runs from.
 * @returns Absolute path of the folder.
 */
export function photosDir(): string {
  return path.resolve(process.env.PHOTOS_DIR ?? "uploads/photos");
}

/**
 * Deletes the files of photos taken off an item; files already gone are ignored.
 * @param files Names of the files to delete.
 */
export async function removePhotoFiles(files: readonly string[]) {
  await Promise.all(files.map((file) => rm(path.join(photosDir(), file), { force: true })));
}

/**
 * Stores a checked photo as sent and its thumbnail: a square WebP of THUMB_SIZE, cropped from the middle and
 * turned upright as the camera meant.
 * @param id The photo's id, which names both files.
 * @param buffer The file's bytes.
 * @param ext Extension from checkPhoto.
 * @returns The names of the original and the thumbnail.
 */
export async function storePhoto(id: string, buffer: Buffer, ext: PhotoExtension): Promise<{ file: string; thumbFile: string }> {
  const dir = photosDir();
  const file = `${id}.${ext}`;
  const thumbFile = `${id}-thumb.webp`;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, file), buffer);
  await sharp(buffer).rotate().resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" }).webp().toFile(path.join(dir, thumbFile));
  return { file, thumbFile };
}
