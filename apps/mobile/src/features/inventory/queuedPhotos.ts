import type { ItemPhoto } from '@apc/domain/items';
import { photoParts, photosChanged } from '@apc/domain/photos';
import type { QueuedOperation, QueuedPhoto } from '@apc/domain/sync-queue';
import { apiUrl } from '../../app/api';
import { newId } from '../../app/ids';
import type { UploadPhoto } from '../../components/ImageUpload';
import { loadQueue } from './inventoryCopy';
import { holdPhoto } from './photoCache';

// Turns the photos a brand should have, as a photo field or the viewer holds them, into the change that sets them, for
// the queue (see @apc/domain/sync-queue): the saved ones kept by their id, the ones of another item copied by their id,
// and each new file held on the phone (see photoCache.ts) under the id the photo shows by until it is sent. A photo
// still waiting in the queue isn't on the server yet, so it goes as its file again, kept under its own id, or, copied,
// held anew under the copy's.

/**
 * Makes the change that sets a brand's photos, when they changed.
 * @param target The item and brand, and the item's name, to say which one if the server refuses it.
 * @param saved The brand's photos as the Inventory shows them.
 * @param photos The photos the brand should have, in order.
 * @returns The change, or null when the photos didn't change.
 */
export async function photosOperation(
  target: { itemId: string; brandId: string; label: string },
  saved: readonly ItemPhoto[],
  photos: readonly UploadPhoto[],
): Promise<QueuedOperation | null> {
  const parts = photoParts(photos, saved, apiUrl());
  if (!photosChanged(parts, saved)) {
    return null;
  }
  const waiting = new Map(
    (await loadQueue()).flatMap((operation) =>
      operation.type === 'savePhotos' ? operation.photos.flatMap((photo) => ('file' in photo ? [[photo.id, photo] as const] : [])) : [],
    ),
  );
  const queued: QueuedPhoto[] = [];
  for (const part of parts) {
    if ('keep' in part) {
      queued.push(waiting.get(part.keep) ?? part);
    } else if ('copy' in part) {
      const file = waiting.get(part.copy);
      const id = newId();
      queued.push(file ? { file: { ...file.file, url: await holdPhoto(id, file.file.url) }, id } : { copy: part.copy, id });
    } else {
      const id = newId();
      queued.push({ file: { url: await holdPhoto(id, part.file.url), name: part.file.name, type: part.file.type }, id });
    }
  }
  return { id: newId(), type: 'savePhotos', ...target, photos: queued, at: new Date().toISOString() };
}
