import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import sharp from "sharp";
import { buildApp } from "../app.js";
import { photosDir, storePhoto } from "../photos/photos.js";
import { signedPhotoPath } from "../sessions/sessions.js";
import { AUTHORIZED, TEST_SESSION, TEST_SESSIONS } from "../sessions/testSessions.js";

// These requests are answered before any database call, so they run without a database, from the stand-in session.

const app = buildApp({ sessions: TEST_SESSIONS });
const ID = "00000000-0000-4000-8000-000000000001";
const PHOTO_ID = "00000000-0000-4000-8000-0000000000aa";

/**
 * Writes a multipart body, as a form with files sends it.
 * @param parts Each part in order: a text field, or a file with its bytes and type.
 * @returns The payload and its content-type header.
 */
function multipart(parts: ({ name: string; value: string } | { name: string; file: Buffer; type: string })[]) {
  const boundary = "apc-boundary";
  const chunks = parts.flatMap((part, index) => [
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"` +
        ("file" in part ? `; filename="foto-${index + 1}"\r\nContent-Type: ${part.type}` : "") +
        "\r\n\r\n",
    ),
    "file" in part ? part.file : Buffer.from(part.value),
    Buffer.from("\r\n"),
  ]);
  return {
    payload: Buffer.concat([...chunks, Buffer.from(`--${boundary}--\r\n`)]),
    headers: { ...AUTHORIZED, "content-type": `multipart/form-data; boundary=${boundary}` },
  };
}

/**
 * Draws a plain photo in a format.
 * @param format Image format.
 * @returns The image's bytes.
 */
function photo(format: "png" | "gif"): Promise<Buffer> {
  return sharp({ create: { width: 8, height: 8, channels: 3, background: "#3366cc" } })
    .toFormat(format)
    .toBuffer();
}

before(async () => {
  process.env.PHOTOS_DIR = await mkdtemp(path.join(tmpdir(), "apc-photo-routes-"));
});

after(async () => {
  await app.close();
  await rm(photosDir(), { recursive: true, force: true });
});

// Sends a GIF, a part that is neither a kept id nor a photo, and four photos, and checks each set is refused naming
// the problem, before the item and its brand are looked up.
test("API: photos that break the rules are refused before anything is stored", async () => {
  const png = await photo("png");
  const gif = await photo("gif");
  const url = `/items/${ID}/brands/${ID}/photos`;

  const pngThenGif = multipart([
    { name: "photo", file: png, type: "image/png" },
    { name: "photo", file: gif, type: "image/png" },
  ]);
  const wrongType = await app.inject({ method: "PUT", url, ...pngThenGif });
  assert.equal(wrongType.statusCode, 400);
  assert.deepEqual(wrongType.json().details, [{ field: "photos", message: "Photo 2 is not a JPG, PNG or WebP image." }]);

  const wrongPart = await app.inject({ method: "PUT", url, ...multipart([{ name: "keep", value: "123" }]) });
  assert.equal(wrongPart.statusCode, 400);
  assert.match(wrongPart.json().details[0].message, /^Part 1 is neither/);

  const four = multipart(["aa", "ab", "ac", "ad"].map((end) => ({ name: "keep", value: PHOTO_ID.replace("aa", end) })));
  const tooMany = await app.inject({ method: "PUT", url, ...four });
  assert.equal(tooMany.statusCode, 400);
  assert.deepEqual(tooMany.json().details, [{ field: "photos", message: "A brand of an item holds at most 3 photos." }]);

  const one = multipart([{ name: "photo", file: png, type: "image/png" }]);
  const badId = await app.inject({ method: "PUT", url: `/items/123/brands/${ID}/photos`, ...one });
  assert.equal(badId.statusCode, 400);
  const badBrand = await app.inject({ method: "PUT", url: `/items/${ID}/brands/123/photos`, ...one });
  assert.equal(badBrand.statusCode, 400);
});

// Stores a photo and checks the photo and the thumbnail are served, without a token, at the paths signed for the
// session, as WebP with a long cache kept on this device only; a missing photo is not found, and a name that isn't a
// photo file, such as a way out of the folder, is refused.
test("API: stored photos are served by their file name only, at a signed path", async () => {
  const stored = await storePhoto(PHOTO_ID, await photo("png"));
  const original = await app.inject({ method: "GET", url: signedPhotoPath(TEST_SESSION, stored.file) });
  assert.equal(original.statusCode, 200);
  assert.equal(original.headers["content-type"], "image/webp");
  assert.equal(original.headers["cache-control"], "private, max-age=31536000, immutable");
  const thumb = await app.inject({ method: "GET", url: signedPhotoPath(TEST_SESSION, stored.thumbFile) });
  assert.equal(thumb.headers["content-type"], "image/webp");

  const missing = await app.inject({ method: "GET", url: signedPhotoPath(TEST_SESSION, `${ID}.jpg`) });
  assert.equal(missing.statusCode, 404);
  const outside = await app.inject({ method: "GET", url: "/photos/..%2F..%2Fpackage.json" });
  assert.equal(outside.statusCode, 400);
});

// Asks for a stored photo with no signature, with the token instead of one, with another file's signature, with a
// signature cut short and for a session that doesn't exist, and checks each is refused with 401 without the file.
test("API: a photo path not signed for a live session is refused", async () => {
  const stored = await storePhoto(PHOTO_ID, await photo("png"));
  const signed = new URL(signedPhotoPath(TEST_SESSION, stored.file), "http://api");
  const thumbSignature = new URL(signedPhotoPath(TEST_SESSION, stored.thumbFile), "http://api").searchParams.get("signature")!;
  const urls = [
    `/photos/${stored.file}`,
    `/photos/${stored.file}?session=${TEST_SESSION.id}&signature=${thumbSignature}`,
    `/photos/${stored.file}?session=${TEST_SESSION.id}&signature=${signed.searchParams.get("signature")!.slice(1)}`,
    `/photos/${stored.file}?session=another-session&signature=${signed.searchParams.get("signature")}`,
  ];
  for (const url of urls) {
    const response = await app.inject({ method: "GET", url });
    assert.equal(response.statusCode, 401, url);
    assert.notEqual(response.headers["content-type"], "image/webp", url);
  }
  const withToken = await app.inject({ method: "GET", url: `/photos/${stored.file}`, headers: AUTHORIZED });
  assert.equal(withToken.statusCode, 401);
});
