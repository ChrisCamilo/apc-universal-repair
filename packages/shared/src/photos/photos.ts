import type { ItemPhoto } from "../items/items.ts";

// Photo rules shared by the web and mobile ImageUpload and the API: which files are accepted, how many photos an
// item holds, the messages that name each file left out and say why, how the photos are sent to be saved, and how
// far a photo is reduced: the web and the phone shrink it before sending it, and the API stores it as WebP at that
// size and quality, so a photo over 3 MB is only refused when it is still over 3 MB once reduced. The API sends a saved
// photo as a path the apps reach through its address; a photo already given as a whole address, as the web app's demo
// gives its own, is reached as it is (photoAddress).

/** Photos an inventory item holds; the first one is its cover in the list. */
export const ITEM_PHOTO_LIMIT = 3;
/** Largest photo accepted, in bytes, after the web or the phone reduced it. */
export const PHOTO_MAX_BYTES = 3 * 1024 * 1024;
/** Longest side a stored photo keeps, in px: a phone photo of 4000×3000 is stored at 1600×1200. */
export const PHOTO_MAX_DIMENSION = 1600;
/**
 * Parts of the request that sets the photos of an item's brand (PUT /items/:id/brands/:brandId/photos), in the order
 * the photos go: a saved photo of the brand kept, by its id, a copy of another brand's saved photo, by its id, or a
 * new file.
 */
export const PHOTO_PARTS = { keep: "keep", copy: "copy", file: "photo" } as const;
/** WebP (and, on the phone, JPEG) quality of a reduced photo, from 0 to 100. */
export const PHOTO_QUALITY = 80;
/** File types accepted: JPG, PNG and WebP. */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * A photo as the photo fields hold it: a saved one has only its URL; one just chosen also has its file; one of another
 * item to be copied also has that photo's id.
 */
export type HeldPhoto<Picked> = { url: string; file?: Picked; copyOf?: string };
/**
 * One part of the request that sets the photos of an item's brand: a saved photo kept by its id, a copy of another
 * photo by its id, or a new file.
 */
export type PhotoPart<Picked> = { keep: string } | { copy: string } | { file: Picked };
/** What the rules read from a chosen file: a browser File, or a photo picked on the phone. */
export type PhotoFile = { name: string; type: string; size: number };

/**
 * Turns another item's saved photos into what the photo fields of a copy hold: their URLs, to show them, and the ids
 * of the photos the API copies once the copy is saved.
 * @param saved The photos to copy, in order.
 * @param apiBase Where the API is reached, as given to heldPhotos.
 * @returns One held photo per photo to copy.
 */
export function copiedPhotos(saved: readonly ItemPhoto[], apiBase: string): HeldPhoto<never>[] {
  return saved.map((photo) => ({ url: photoAddress(photo.url, apiBase), copyOf: photo.id }));
}

/**
 * Gives the size a photo is reduced to: its longest side down to PHOTO_MAX_DIMENSION, in proportion, and never
 * enlarged.
 * @param width The photo's width, in px.
 * @param height The photo's height, in px.
 * @returns The reduced width and height, rounded; the same size when it already fits.
 */
export function fitPhoto(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Turns an item's saved photos into what the photo fields hold: their URLs, reached through the API's address.
 * @param saved The item's photos, in order.
 * @param apiBase Where the API is reached: "/api" on the web, API_URL on the phone.
 * @returns One held photo per saved photo.
 */
export function heldPhotos(saved: readonly ItemPhoto[], apiBase: string): HeldPhoto<never>[] {
  return saved.map((photo) => ({ url: photoAddress(photo.url, apiBase) }));
}

/**
 * Gives where a saved photo, or its thumbnail, is reached: its path under the API's address, or, when it is a whole
 * address already (blob:, https:), that address.
 * @param url The photo's url or thumbUrl, as the API sends it.
 * @param apiBase Where the API is reached: "/api" on the web, API_URL on the phone.
 * @returns E.g. "/api/photos/<id>.webp", or "blob:https://…" as it came.
 */
export function photoAddress(url: string, apiBase: string): string {
  return /^[a-z][a-z\d+.-]*:/i.test(url) ? url : `${apiBase}${url}`;
}

/**
 * Counts photos in pt-BR, e.g. for "Arraste até 3 fotos".
 * @param count Number of photos.
 * @returns "1 foto" or "3 fotos".
 */
export function photoCount(count: number): string {
  return `${count} ${count === 1 ? "foto" : "fotos"}`;
}

/**
 * Lists the parts that set an item's photos to the ones a field holds, in its order: each saved photo still held is
 * kept by its id, found by its URL, each photo of another item is copied by its id, and each photo just chosen is sent
 * as a file.
 * @param photos Photos the field holds, in order.
 * @param saved The item's saved photos.
 * @param apiBase Where the API is reached, as given to heldPhotos.
 * @returns The parts, in order.
 */
export function photoParts<Picked>(
  photos: readonly HeldPhoto<Picked>[],
  saved: readonly ItemPhoto[],
  apiBase: string,
): PhotoPart<Picked>[] {
  return photos.flatMap((photo): PhotoPart<Picked>[] => {
    if (photo.file) {
      return [{ file: photo.file }];
    }
    if (photo.copyOf) {
      return [{ copy: photo.copyOf }];
    }
    const kept = saved.find((savedPhoto) => photoAddress(savedPhoto.url, apiBase) === photo.url);
    return kept ? [{ keep: kept.id }] : [];
  });
}

/**
 * Says why a file can't be a photo: not JPG, PNG or WebP, or still larger than 3 MB after the web or the phone
 * reduced it.
 * @param file Chosen file, as reduced.
 * @returns The reason, or null when the file is accepted.
 */
export function photoProblem(file: PhotoFile): string | null {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) {
    return "não é JPG, PNG ou WebP";
  }
  if (file.size > PHOTO_MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1).replace(".", ",");
    return `tem ${mb} MB mesmo reduzida, e o limite é 3 MB`;
  }
  return null;
}

/**
 * Tells whether a field's photos differ from the item's saved ones, so saving needs to send them.
 * @param parts Parts from photoParts.
 * @param saved The item's saved photos.
 * @returns True when a photo was added, removed, replaced or moved.
 */
export function photosChanged(parts: readonly PhotoPart<unknown>[], saved: readonly ItemPhoto[]): boolean {
  return parts.length !== saved.length || parts.some((part, index) => !("keep" in part) || part.keep !== saved[index].id);
}

/**
 * Takes the chosen files in order while there is room: files that break the rules, and files past the limit,
 * are left out with a message that names each one and says why.
 * @param files Chosen files, in order.
 * @param held Photos already held.
 * @param limit Most photos allowed.
 * @returns The accepted files and one message per file left out, e.g. "motor.gif: não é JPG, PNG ou WebP".
 */
export function takePhotos<Picked extends PhotoFile>(
  files: readonly Picked[],
  held: number,
  limit: number,
): { accepted: Picked[]; problems: string[] } {
  const accepted: Picked[] = [];
  const problems: string[] = [];
  for (const file of files) {
    const problem = held + accepted.length >= limit ? `passou do limite de ${photoCount(limit)}` : photoProblem(file);
    if (problem) {
      problems.push(`${file.name}: ${problem}`);
    } else {
      accepted.push(file);
    }
  }
  return { accepted, problems };
}
