// Photo rules shared by the web and mobile ImageUpload and the API: which files are accepted, how many photos an
// item holds, the messages that name each file left out and say why, and how the photos are sent to be saved.

/** Photos an inventory item holds; the first one is its cover in the list. */
export const ITEM_PHOTO_LIMIT = 3;
/** Largest photo accepted, in bytes. */
export const PHOTO_MAX_BYTES = 3 * 1024 * 1024;
/**
 * Parts of the request that sets an item's photos (PUT /items/:id/photos), in the order the photos go: a saved photo
 * kept, by its id, or a new file.
 */
export const PHOTO_PARTS = { keep: "keep", file: "photo" } as const;
/** File types accepted: JPG, PNG and WebP. */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** What the rules read from a chosen file: a browser File, or a photo picked on the phone. */
export type PhotoFile = { name: string; type: string; size: number };

/**
 * Counts photos in pt-BR, e.g. for "Arraste até 3 fotos".
 * @param count Number of photos.
 * @returns "1 foto" or "3 fotos".
 */
export function photoCount(count: number): string {
  return `${count} ${count === 1 ? "foto" : "fotos"}`;
}

/**
 * Says why a file can't be a photo: not JPG, PNG or WebP, or larger than 3 MB.
 * @param file Chosen file.
 * @returns The reason, or null when the file is accepted.
 */
export function photoProblem(file: PhotoFile): string | null {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) {
    return "não é JPG, PNG ou WebP";
  }
  if (file.size > PHOTO_MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1).replace(".", ",");
    return `tem ${mb} MB, e o limite é 3 MB`;
  }
  return null;
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
