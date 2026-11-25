/**
 * @format
 */

import { NativeModules } from 'react-native';
import type { ItemPhoto } from '@apc/domain/items';
import { photoParts } from '@apc/domain/photos';
import { clearCopy } from '../src/features/sync/inventoryCopy';
import {
  FULL_PHOTOS_MAX_BYTES,
  heldPhotos,
  keepFullPhotos,
  keepThumbnails,
  photoSource,
} from '../src/features/sync/photoCache';

// The photos the phone keeps, against the setup's stand-in for the native side, which "downloads" each photo at once:
// every thumbnail after a sync, the full photos of the items opened within their limit, the photos gone dropped, and
// all of them cleared with the copy.

/** The native side that keeps the photos (PhotoCacheModule.kt), as the setup stands in for it. */
const native = NativeModules.PhotoCache as Record<'list' | 'save' | 'touch' | 'remove' | 'trim' | 'clear', jest.Mock>;
/** Two photos, as the copy holds them, at paths signed for the session. */
const PHOTOS: ItemPhoto[] = [
  { id: '00000000-0000-4000-8000-0000000000f1', url: '/photos/f1.webp?s=1', thumbUrl: '/photos/f1-thumb.webp?s=1' },
  { id: '00000000-0000-4000-8000-0000000000f2', url: '/photos/f2.webp?s=1', thumbUrl: '/photos/f2-thumb.webp?s=1' },
];

// Each test reads only the calls it made.
beforeEach(() => Object.values(native).forEach((mock) => mock.mockClear()));

// Keeps the thumbnails after a sync, twice, and checks each one is downloaded once, from its signed path, and shows
// from its file; a photo not kept shows from the server.
test('Mobile: every thumbnail is kept once, and shows from its file', async () => {
  expect(photoSource(PHOTOS[0], 'thumb')).toMatch(/\/photos\/f1-thumb\.webp\?s=1$/);
  await keepThumbnails(PHOTOS);
  await keepThumbnails(PHOTOS);
  expect(native.save.mock.calls.map(([kind, id, url]) => [kind, id, url.replace(/^.*\/photos/, '/photos')])).toEqual([
    ['thumb', PHOTOS[0].id, PHOTOS[0].thumbUrl],
    ['thumb', PHOTOS[1].id, PHOTOS[1].thumbUrl],
  ]);
  expect(photoSource(PHOTOS[0], 'thumb')).toBe(`file:///photos/thumb/${PHOTOS[0].id}`);
  expect(photoSource(PHOTOS[0], 'full')).toMatch(/\/photos\/f1\.webp\?s=1$/);
});

// Keeps both photos, the full one of the first too, then syncs a copy that no longer has the first, and checks both of
// its files are dropped and it shows from the server again.
test('Mobile: the photos the copy no longer has are dropped', async () => {
  await keepThumbnails(PHOTOS);
  await keepFullPhotos([PHOTOS[0]]);
  await keepThumbnails([PHOTOS[1]]);
  expect(native.remove).toHaveBeenCalledWith('thumb', [PHOTOS[0].id]);
  expect(native.remove).toHaveBeenCalledWith('full', [PHOTOS[0].id]);
  expect(photoSource(PHOTOS[0], 'thumb')).toMatch(/\/photos\/f1-thumb\.webp/);
  expect(photoSource(PHOTOS[1], 'thumb')).toBe(`file:///photos/thumb/${PHOTOS[1].id}`);
});

// Opens an item's photos twice and checks the first time downloads them, the second marks them as just used, and each
// time the full photos are cut back to their limit, the ones the native side drops no longer shown from their files.
test('Mobile: the full photos of an item opened are kept within their limit', async () => {
  await keepFullPhotos(PHOTOS);
  expect(native.save.mock.calls.map(([kind, id]) => [kind, id])).toEqual(PHOTOS.map((photo) => ['full', photo.id]));
  expect(native.trim).toHaveBeenLastCalledWith('full', FULL_PHOTOS_MAX_BYTES);
  native.trim.mockResolvedValueOnce([PHOTOS[1].id]);
  await keepFullPhotos([PHOTOS[0]]);
  expect(native.touch).toHaveBeenLastCalledWith('full', [PHOTOS[0].id]);
  expect(photoSource(PHOTOS[0], 'full')).toBe(`file:///photos/full/${PHOTOS[0].id}`);
  expect(photoSource(PHOTOS[1], 'full')).toMatch(/\/photos\/f2\.webp/);
});

// Holds an item's photos with their full photos kept, as the details and the viewer do, and checks they show from
// their files and are still kept by their ids when saved.
test('Mobile: a photo shown from its file is still kept when the item is saved', async () => {
  await keepFullPhotos(PHOTOS);
  const held = heldPhotos(PHOTOS);
  expect(held.map((photo) => photo.url)).toEqual(PHOTOS.map((photo) => `file:///photos/full/${photo.id}`));
  expect(photoParts(held, PHOTOS, 'http://localhost:3333')).toEqual(PHOTOS.map((photo) => ({ keep: photo.id })));
});

// Clears the copy while a thumbnail is still downloading, as logging out does, and checks every photo is dropped and
// the download that finishes afterwards keeps nothing.
test('Mobile: clearing the copy drops the photos, and a download still running keeps nothing', async () => {
  await keepThumbnails([PHOTOS[0]]);
  let finish = () => {};
  native.save.mockImplementationOnce((kind: string, id: string) => new Promise((resolve) => (finish = () => resolve(`file:///photos/${kind}/${id}`))));
  const downloading = keepThumbnails(PHOTOS);
  await new Promise<void>((resolve) => setImmediate(resolve));
  await clearCopy();
  finish();
  await downloading;
  expect(native.clear).toHaveBeenCalled();
  expect(photoSource(PHOTOS[0], 'thumb')).toMatch(/\/photos\/f1-thumb\.webp/);
  expect(photoSource(PHOTOS[1], 'thumb')).toMatch(/\/photos\/f2-thumb\.webp/);
});

// Starts the app again with photos kept on disk and checks they show from their files before any sync.
test('Mobile: the photos kept are read back as the app starts again', async () => {
  native.list.mockResolvedValueOnce({ thumb: { [PHOTOS[0].id]: 'file:///kept/thumb' }, full: {} });
  await jest.isolateModulesAsync(async () => {
    const again = require('../src/features/sync/photoCache') as typeof import('../src/features/sync/photoCache');
    await again.keepFullPhotos([]);
    expect(again.photoSource(PHOTOS[0], 'thumb')).toBe('file:///kept/thumb');
  });
});
