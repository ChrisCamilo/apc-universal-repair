import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import sharp from "sharp";
import { PHOTO_MAX_BYTES } from "@apc/shared/photos";
import { checkPhoto, photoOf, photosDir, removePhotoFiles, storePhoto, THUMB_SIZE } from "./photos.js";

const ID = "00000000-0000-4000-8000-000000000001";

/**
 * Draws a plain photo in a format.
 * @param format Image format.
 * @param width Width in px.
 * @param height Height in px.
 * @returns The image's bytes.
 */
function photo(format: "jpeg" | "png" | "webp" | "gif", width = 40, height = 20): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: "#3366cc" } })
    .toFormat(format)
    .toBuffer();
}

before(async () => {
  process.env.PHOTOS_DIR = await mkdtemp(path.join(tmpdir(), "apc-photos-"));
});

after(async () => {
  await rm(photosDir(), { recursive: true, force: true });
});

// Checks JPG, PNG and WebP are taken by their content and get their extension, while a GIF, bytes that aren't an
// image and a file over 3 MB are refused with the reason.
test("API: photos are checked by their content and size", async () => {
  assert.deepEqual(await checkPhoto(await photo("jpeg")), { ext: "jpg" });
  assert.deepEqual(await checkPhoto(await photo("png")), { ext: "png" });
  assert.deepEqual(await checkPhoto(await photo("webp")), { ext: "webp" });
  assert.deepEqual(await checkPhoto(await photo("gif")), { problem: "is not a JPG, PNG or WebP image" });
  assert.deepEqual(await checkPhoto(Buffer.from("not an image")), { problem: "is not a JPG, PNG or WebP image" });
  assert.deepEqual(await checkPhoto(Buffer.alloc(PHOTO_MAX_BYTES + 1)), { problem: "is larger than 3 MB" });
});

// Stores a wide PNG and checks the original is kept as sent, the thumbnail is a square WebP of THUMB_SIZE named
// after the photo, the paths it is served at, and that removing it deletes both files.
test("API: a stored photo keeps its original next to a square thumbnail", async () => {
  const sent = await photo("png", 400, 200);
  const stored = await storePhoto(ID, sent, "png");
  assert.deepEqual(stored, { file: `${ID}.png`, thumbFile: `${ID}-thumb.webp` });
  const thumb = await sharp(await readFile(path.join(photosDir(), stored.thumbFile))).metadata();
  assert.deepEqual([thumb.format, thumb.width, thumb.height], ["webp", THUMB_SIZE, THUMB_SIZE]);
  const original = await sharp(await readFile(path.join(photosDir(), stored.file))).metadata();
  assert.deepEqual([original.format, original.width], ["png", 400]);
  assert.deepEqual(photoOf({ id: ID, ...stored }), { id: ID, url: `/photos/${ID}.png`, thumbUrl: `/photos/${ID}-thumb.webp` });

  await removePhotoFiles([stored.file, stored.thumbFile, "gone.jpg"]);
  assert.deepEqual(await readdir(photosDir()), []);
});
