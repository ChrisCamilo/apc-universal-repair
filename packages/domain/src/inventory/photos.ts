import { catalog, type Locale } from "../platform/locale/locale.ts";
import type { ItemPhoto } from "./items.ts";

// Photo rules shared by the web and mobile ImageUpload and the API: which files are accepted, how many photos an
// item holds, the messages that name each file left out and say why, how the photos are sent to be saved, and how
// far a photo is reduced: the web and the phone shrink it before sending it, and the API stores it as WebP at that
// size and quality, so a photo over 3 MB is only refused when it is still over 3 MB once reduced. The API sends a saved
// photo as a path the apps reach through its address; a photo already given as a whole address, as the web app's demo
// gives its own, is reached as it is (photoAddress). A brand may also take copies of other items' photos, checked in
// the photo picker up to the room it has (pickPhoto), which the API copies when the item is saved.

/** Photos an inventory item holds; the first one is its cover in the list. */
export const ITEM_PHOTO_LIMIT = 3;
/** Largest photo accepted, in bytes, after the web or the phone reduced it. */
export const PHOTO_MAX_BYTES = 3 * 1024 * 1024;
/** Longest side a stored photo keeps, in px: a phone photo of 4000×3000 is stored at 1600×1200. */
export const PHOTO_MAX_DIMENSION = 1600;
/** What the photo rules say: how many photos, and why a file was left out. */
export const PHOTO_MESSAGES = catalog(
  {
    count: (count: number) => `${count} ${count === 1 ? "foto" : "fotos"}`,
    wrongType: "não é JPG, PNG ou WebP",
    tooLarge: (megabytes: string) => `tem ${megabytes} MB mesmo reduzida, e o limite é 3 MB`,
    pastLimit: (limit: string) => `passou do limite de ${limit}`,
  },
  {
    count: (count) => `${count} ${count === 1 ? "photo" : "photos"}`,
    wrongType: "isn't a JPG, PNG or WebP",
    tooLarge: (megabytes) => `is ${megabytes} MB even reduced, and the limit is 3 MB`,
    pastLimit: (limit) => `goes past the limit of ${limit}`,
  },
);
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
 * A photo as the photo fields hold it: a saved one has its URL and its id, which keeps it when saved, so the URL can be
 * another copy of it, such as the phone's cached file; one just chosen also has its file; one of another item to be
 * copied also has that photo's id.
 */
export type HeldPhoto<Picked> = { url: string; keeps?: string; file?: Picked; copyOf?: string };
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
 * Turns an item's saved photos into what the photo fields hold: their URLs, reached through the API's address, and
 * their ids.
 * @param saved The item's photos, in order.
 * @param apiBase Where the API is reached: "/api" on the web, API_URL on the phone.
 * @returns One held photo per saved photo.
 */
export function heldPhotos(saved: readonly ItemPhoto[], apiBase: string): HeldPhoto<never>[] {
  return saved.map((photo) => ({ url: photoAddress(photo.url, apiBase), keeps: photo.id }));
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
 * Counts photos, e.g. for "Arraste até 3 fotos".
 * @param count Number of photos.
 * @param locale The language.
 * @returns "1 foto" or "3 fotos" ("1 photo" or "3 photos" in English).
 */
export function photoCount(count: number, locale: Locale): string {
  return PHOTO_MESSAGES[locale].count(count);
}

/**
 * Checks or unchecks a photo in the photo picker ("Usar fotos de outra peça"): a checked one leaves, and an unchecked
 * one joins at the end while there is room, from one item or several.
 * @param picked The photos checked so far, in the order they were checked.
 * @param photo The photo pressed.
 * @param room How many photos the brand still takes: ITEM_PHOTO_LIMIT less the ones it has.
 * @returns The photos checked after the press; the same ones when it is full.
 */
export function pickPhoto(picked: readonly ItemPhoto[], photo: ItemPhoto, room: number): ItemPhoto[] {
  if (picked.some((each) => each.id === photo.id)) {
    return picked.filter((each) => each.id !== photo.id);
  }
  return picked.length < room ? [...picked, photo] : [...picked];
}

/**
 * Lists the parts that set an item's photos to the ones a field holds, in its order: each saved photo still held is
 * kept by its id (by its URL for one held without it), each photo of another item is copied by its id, and each photo
 * just chosen is sent as a file.
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
    const kept = saved.find((savedPhoto) => (photo.keeps ? savedPhoto.id === photo.keeps : photoAddress(savedPhoto.url, apiBase) === photo.url));
    return kept ? [{ keep: kept.id }] : [];
  });
}

/**
 * Says why a file can't be a photo: not JPG, PNG or WebP, or still larger than 3 MB after the web or the phone
 * reduced it.
 * @param file Chosen file, as reduced.
 * @param locale The language.
 * @returns The reason, or null when the file is accepted.
 */
export function photoProblem(file: PhotoFile, locale: Locale): string | null {
  const messages = PHOTO_MESSAGES[locale];
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) {
    return messages.wrongType;
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return messages.tooLarge(new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(file.size / 1024 / 1024));
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
 * @param locale The language of the messages.
 * @returns The accepted files and one message per file left out, e.g. "motor.gif: não é JPG, PNG ou WebP".
 */
export function takePhotos<Picked extends PhotoFile>(
  files: readonly Picked[],
  held: number,
  limit: number,
  locale: Locale,
): { accepted: Picked[]; problems: string[] } {
  const accepted: Picked[] = [];
  const problems: string[] = [];
  for (const file of files) {
    const problem = held + accepted.length >= limit ? PHOTO_MESSAGES[locale].pastLimit(photoCount(limit, locale)) : photoProblem(file, locale);
    if (problem) {
      problems.push(`${file.name}: ${problem}`);
    } else {
      accepted.push(file);
    }
  }
  return { accepted, problems };
}
