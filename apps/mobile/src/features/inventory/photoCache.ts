import { useEffect, useState } from 'react';
import { NativeModules } from 'react-native';
import type { ItemPhoto } from '@apc/domain/items';
import { heldPhotos as serverHeldPhotos, photoAddress, type HeldPhoto } from '@apc/domain/photos';
import { apiUrl } from '../../app/api';

// The item photos the phone keeps, so the Inventory and the Catalog show them away from the server: every photo's
// thumbnail, downloaded after each sync of the copy, and the full photos of the items opened, the least recently used
// dropped past FULL_PHOTOS_MAX_BYTES. They are kept by the native side (PhotoCacheModule.kt) in the app's own storage,
// which other apps can't read and backups leave out (allowBackup is off); unlike the copy they aren't encrypted, as a
// part's photo says no more than the copy does and the screens show them straight from their files. A photo is kept
// by its id, not its path, as the paths are signed for the session. A photo the copy no longer has, its item or brand
// deleted, is dropped at the next sync, and clearing the copy clears them all (see inventoryCopy.ts). Where the screens
// show a photo, they take its kept file when there is one, and the server's address otherwise.

/** How much the full photos may take, in bytes: a few hundred photos at 1600px. */
export const FULL_PHOTOS_MAX_BYTES = 100 * 1024 * 1024;
/** How many photos download at once. */
const DOWNLOADS_AT_ONCE = 4;

/** A kind of photo kept: the thumbnail, or the full photo. */
type Kind = 'thumb' | 'full';
/** The native side that keeps the photos (PhotoCacheModule.kt). */
const native = NativeModules.PhotoCache as {
  list: () => Promise<Record<Kind, Record<string, string>>>;
  save: (kind: Kind, id: string, url: string) => Promise<string>;
  touch: (kind: Kind, ids: string[]) => void;
  remove: (kind: Kind, ids: string[]) => Promise<void>;
  trim: (kind: Kind, maxBytes: number) => Promise<string[]>;
  clear: () => Promise<void>;
};

/** The photos kept, by kind: each photo's id and its file's address. */
const kept: Record<Kind, Map<string, string>> = { thumb: new Map(), full: new Map() };
/** The list of what is kept, read once from the native side. */
let listed: Promise<void> | null = null;
/** Bumped by each clear, so downloads started before it keep nothing. */
let generation = 0;
/** What to call when the photos kept change. */
const listeners = new Set<() => void>();

/** Tells the listeners the photos kept changed. */
function changed() {
  listeners.forEach((listener) => listener());
}

/**
 * Reads what the native side keeps, the first time.
 * @returns Once read.
 */
function load(): Promise<void> {
  listed ??= native
    .list()
    .then((files) => {
      for (const kind of ['thumb', 'full'] as const) {
        Object.entries(files[kind]).forEach(([id, file]) => kept[kind].set(id, file));
      }
      changed();
    })
    .catch(() => {});
  return listed;
}

/**
 * Downloads the photos of a kind not kept yet, a few at a time.
 * @param kind The kind.
 * @param photos The photos.
 */
async function download(kind: Kind, photos: readonly ItemPhoto[]) {
  const started = generation;
  const missing = photos.filter((photo) => !kept[kind].has(photo.id));
  let next = 0;
  const worker = async () => {
    while (next < missing.length) {
      const photo = missing[next++];
      const file = await native.save(kind, photo.id, photoAddress(kind === 'thumb' ? photo.thumbUrl : photo.url, apiUrl())).catch(() => null);
      if (file && generation === started) {
        kept[kind].set(photo.id, file);
        changed();
      }
    }
  };
  await Promise.all(Array.from({ length: DOWNLOADS_AT_ONCE }, worker));
}

/**
 * Keeps the thumbnail of every photo of the copy, and drops the photos, of both kinds, the copy no longer has.
 * @param photos Every photo of the copy.
 */
export async function keepThumbnails(photos: readonly ItemPhoto[]): Promise<void> {
  await load();
  const ids = new Set(photos.map((photo) => photo.id));
  for (const kind of ['thumb', 'full'] as const) {
    const gone = [...kept[kind].keys()].filter((id) => !ids.has(id));
    if (gone.length > 0) {
      gone.forEach((id) => kept[kind].delete(id));
      await native.remove(kind, gone).catch(() => {});
      changed();
    }
  }
  await download('thumb', photos);
}

/**
 * Keeps the full photos of an item opened, as the last used, and drops the least recently used past the limit.
 * @param photos The photos opened.
 */
export async function keepFullPhotos(photos: readonly ItemPhoto[]): Promise<void> {
  await load();
  native.touch(
    'full',
    photos.filter((photo) => kept.full.has(photo.id)).map((photo) => photo.id),
  );
  await download('full', photos);
  const dropped = await native.trim('full', FULL_PHOTOS_MAX_BYTES).catch(() => []);
  if (dropped.length > 0) {
    dropped.forEach((id) => kept.full.delete(id));
    changed();
  }
}

/**
 * Drops every photo kept, as clearing the copy does.
 */
export async function clearPhotos(): Promise<void> {
  generation += 1;
  kept.thumb.clear();
  kept.full.clear();
  await native.clear().catch(() => {});
  changed();
}

/**
 * Gives where a photo shows from: its kept file, or the server's address.
 * @param photo The photo.
 * @param kind The thumbnail or the full photo.
 * @returns The file's address, e.g. "file:///data/…/photos/thumb/<id>", or the photo's address on the server.
 */
export function photoSource(photo: ItemPhoto, kind: Kind): string {
  return kept[kind].get(photo.id) ?? photoAddress(kind === 'thumb' ? photo.thumbUrl : photo.url, apiUrl());
}

/**
 * Turns an item's saved photos into what the photo fields hold, as heldPhotos does, each shown from its kept full
 * photo when there is one; they are still kept by their ids when saved.
 * @param saved The item's photos, in order.
 * @returns One held photo per saved photo.
 */
export function heldPhotos(saved: readonly ItemPhoto[]): HeldPhoto<never>[] {
  return serverHeldPhotos(saved, apiUrl()).map((held, at) => ({ ...held, url: photoSource(saved[at], 'full') }));
}

/**
 * Follows the photos kept, so a screen shows each one from its file as soon as it is kept.
 * @returns A number that changes each time they change.
 */
export function usePhotoCache(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const listener = () => setVersion((count) => count + 1);
    listeners.add(listener);
    load();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return version;
}
