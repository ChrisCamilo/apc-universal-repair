import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import sharp from "sharp";
import { PHOTO_MAX_BYTES, PHOTO_MAX_DIMENSION } from "@apc/shared/photos";
import { checkPhoto, photoOf, photosDir, reduceStoredPhoto, removePhotoFiles, storePhoto, THUMB_SIZE } from "./photos.js";

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

/**
 * Draws a photo with grain, which compresses like a real one, unlike a plain color.
 * @param format Image format.
 * @param width Width in px.
 * @param height Height in px.
 * @param orientation EXIF orientation to tag it with, e.g. 6 for a phone held upright.
 * @returns The image's bytes.
 */
function grainyPhoto(format: "jpeg" | "png", width: number, height: number, orientation?: number): Promise<Buffer> {
  const image = sharp({ create: { width, height, channels: 3, background: "#808080", noise: { type: "gaussian", mean: 128, sigma: 40 } } }).toFormat(format);
  return (orientation ? image.withMetadata({ orientation }) : image).toBuffer();
}

/**
 * Reads a stored file's format, size and metadata.
 * @param file The file's name under PHOTOS_DIR.
 * @returns What sharp reads from it, and its size in bytes.
 */
async function stored(file: string) {
  const buffer = await readFile(path.join(photosDir(), file));
  return { ...(await sharp(buffer).metadata()), bytes: buffer.length };
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
  assert.equal(await checkPhoto(await photo("jpeg")), null);
  assert.equal(await checkPhoto(await photo("png")), null);
  assert.equal(await checkPhoto(await photo("webp")), null);
  assert.equal(await checkPhoto(await photo("gif")), "is not a JPG, PNG or WebP image");
  assert.equal(await checkPhoto(Buffer.from("not an image")), "is not a JPG, PNG or WebP image");
  assert.equal(await checkPhoto(Buffer.alloc(PHOTO_MAX_BYTES + 1)), "is larger than 3 MB");
});

// Stores a large wide PNG and checks it is kept as a WebP whose longest side is PHOTO_MAX_DIMENSION, in proportion
// and much smaller than sent, next to a square WebP thumbnail of THUMB_SIZE; the paths it is served at; and that
// removing it deletes both files.
test("API: a stored photo is reduced to WebP next to a square thumbnail", async () => {
  const sent = await grainyPhoto("png", 3200, 800);
  const files = await storePhoto(ID, sent);
  assert.deepEqual(files, { file: `${ID}.webp`, thumbFile: `${ID}-thumb.webp` });
  const reduced = await stored(files.file);
  assert.deepEqual([reduced.format, reduced.width, reduced.height], ["webp", PHOTO_MAX_DIMENSION, 400]);
  assert.ok(reduced.bytes < sent.length / 2, `${reduced.bytes} bytes from ${sent.length}`);
  const thumb = await stored(files.thumbFile);
  assert.deepEqual([thumb.format, thumb.width, thumb.height], ["webp", THUMB_SIZE, THUMB_SIZE]);
  assert.deepEqual(photoOf({ id: ID, ...files }), { id: ID, url: `/photos/${ID}.webp`, thumbUrl: `/photos/${ID}-thumb.webp` });

  await removePhotoFiles([files.file, files.thumbFile, "gone.jpg"]);
  assert.deepEqual(await readdir(photosDir()), []);
});

// Stores a landscape JPEG a phone tagged as held upright (EXIF orientation 6), and checks the stored photo is
// portrait, fitted in PHOTO_MAX_DIMENSION, with no EXIF left; a small photo keeps its size instead of growing.
test("API: a stored photo is turned upright, loses its metadata and is never enlarged", async () => {
  const files = await storePhoto(ID, await grainyPhoto("jpeg", 2400, 1800, 6));
  const upright = await stored(files.file);
  assert.deepEqual([upright.width, upright.height], [1200, PHOTO_MAX_DIMENSION]);
  assert.equal(upright.exif, undefined);
  assert.equal(upright.orientation, undefined);

  const small = await stored((await storePhoto(ID, await photo("png", 40, 20))).file);
  assert.deepEqual([small.format, small.width, small.height], ["webp", 40, 20]);
  await removePhotoFiles(await readdir(photosDir()));
});

// Reduces a large JPEG stored before photos were reduced: it becomes `<id>.webp` within PHOTO_MAX_DIMENSION, the
// row gets the new name before the old file is deleted, and a second run leaves it as it is and saves nothing.
test("API: photos stored before are reduced once, and running it again changes nothing", async () => {
  await writeFile(path.join(photosDir(), `${ID}.jpg`), await grainyPhoto("jpeg", 4000, 3000));
  const saved: string[] = [];
  const save = async (file: string) => {
    saved.push(file);
  };

  assert.equal(await reduceStoredPhoto({ id: ID, file: `${ID}.jpg` }, save), `${ID}.webp`);
  assert.deepEqual(saved, [`${ID}.webp`]);
  assert.deepEqual(await readdir(photosDir()), [`${ID}.webp`]);
  const reduced = await stored(`${ID}.webp`);
  assert.deepEqual([reduced.format, reduced.width, reduced.height], ["webp", PHOTO_MAX_DIMENSION, 1200]);

  assert.equal(await reduceStoredPhoto({ id: ID, file: `${ID}.webp` }, save), null);
  assert.deepEqual(saved, [`${ID}.webp`]);
  assert.equal((await stored(`${ID}.webp`)).bytes, reduced.bytes);
});
