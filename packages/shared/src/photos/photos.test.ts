import assert from "node:assert/strict";
import { test } from "node:test";
import type { ItemPhoto } from "../items/items.ts";
import {
  heldPhotos,
  ITEM_PHOTO_LIMIT,
  PHOTO_MAX_BYTES,
  photoCount,
  photoParts,
  photoProblem,
  photosChanged,
  takePhotos,
} from "./photos.ts";

const MB = 1024 * 1024;
const SAVED: ItemPhoto[] = ["a", "b"].map((id) => ({ id, url: `/photos/${id}.jpg`, thumbUrl: `/photos/${id}-thumb.webp` }));

// Checks JPG, PNG and WebP up to 3 MB pass, and other types and larger photos are refused with the reason,
// the size written in pt-BR.
test("Shared: photos must be JPG, PNG or WebP up to 3 MB", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(photoProblem({ name: "a", type, size: PHOTO_MAX_BYTES }), null);
  }
  assert.equal(photoProblem({ name: "a.gif", type: "image/gif", size: MB }), "não é JPG, PNG ou WebP");
  assert.equal(photoProblem({ name: "a.pdf", type: "application/pdf", size: MB }), "não é JPG, PNG ou WebP");
  assert.equal(photoProblem({ name: "a.jpg", type: "image/jpeg", size: 4.2 * MB }), "tem 4,2 MB, e o limite é 3 MB");
});

// Picks five files with one photo already held and checks the good ones are taken in order until the limit,
// and every file left out is named with its reason: wrong type, too large or past the limit.
test("Shared: taking photos stops at the limit and names each file left out", () => {
  const files = [
    { name: "frente.jpg", type: "image/jpeg", size: MB },
    { name: "motor.gif", type: "image/gif", size: MB },
    { name: "lado.png", type: "image/png", size: 5 * MB },
    { name: "traseira.webp", type: "image/webp", size: MB },
    { name: "painel.jpg", type: "image/jpeg", size: MB },
  ];
  const { accepted, problems } = takePhotos(files, 1, ITEM_PHOTO_LIMIT);
  assert.deepEqual(accepted.map((f) => f.name), ["frente.jpg", "traseira.webp"]);
  assert.deepEqual(problems, [
    "motor.gif: não é JPG, PNG ou WebP",
    "lado.png: tem 5,0 MB, e o limite é 3 MB",
    "painel.jpg: passou do limite de 3 fotos",
  ]);
});

// Counts photos in the singular and the plural.
test("Shared: photo counts read in pt-BR", () => {
  assert.equal(photoCount(1), "1 foto");
  assert.equal(photoCount(3), "3 fotos");
});

// Holds an item's two saved photos through the API's address, then checks the parts that save a field: unchanged
// keeps both in order and sends nothing; swapped, one removed, or one replaced by a new file each send the change.
test("Shared: a field's photos become the parts that save them, only when changed", () => {
  const held = heldPhotos(SAVED, "/api");
  assert.deepEqual(held, [{ url: "/api/photos/a.jpg" }, { url: "/api/photos/b.jpg" }]);

  const same = photoParts(held, SAVED, "/api");
  assert.deepEqual(same, [{ keep: "a" }, { keep: "b" }]);
  assert.equal(photosChanged(same, SAVED), false);

  const swapped = photoParts([held[1], held[0]], SAVED, "/api");
  assert.deepEqual(swapped, [{ keep: "b" }, { keep: "a" }]);
  assert.equal(photosChanged(swapped, SAVED), true);
  assert.equal(photosChanged(photoParts([held[0]], SAVED, "/api"), SAVED), true);

  const replaced = photoParts([{ url: "blob:nova", file: "nova.png" }, held[1]], SAVED, "/api");
  assert.deepEqual(replaced, [{ file: "nova.png" }, { keep: "b" }]);
  assert.equal(photosChanged(replaced, SAVED), true);
});
