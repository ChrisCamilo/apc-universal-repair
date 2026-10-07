import { launchImageLibrary } from 'react-native-image-picker';
import { itemSchema, type Item } from '@apc/shared/items';
import { ITEM_PHOTO_LIMIT, PHOTO_PARTS, photoParts, photosChanged } from '@apc/shared/photos';
import { API_URL } from '../api';
import type { PickedPhoto, UploadPhoto } from '../ImageUpload';

// The item photos on the phone: the photo library to pick them from, and saving an item's photos as a photo field
// or the viewer holds them, the same as the web: the saved ones kept by their id and the new files sent, all in one
// request, in their order, and nothing sent when the photos didn't change.

/**
 * Opens the phone's photo library to pick up to ITEM_PHOTO_LIMIT photos.
 * @returns The photos chosen, with what the photo rules check; none when the user cancels.
 */
export async function pickPhotos(): Promise<PickedPhoto[]> {
  const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: ITEM_PHOTO_LIMIT });
  return (result.assets ?? []).flatMap((asset) =>
    asset.uri ? [{ url: asset.uri, name: asset.fileName ?? 'foto', type: asset.type ?? '', size: asset.fileSize ?? 0 }] : [],
  );
}

/**
 * Saves an item's photos when they changed.
 * @param item The item as saved, with its saved photos.
 * @param photos The photos it should have, in order.
 * @returns The item with its photos as the API saved them (the same item when nothing changed), or null when the
 * photos couldn't be saved.
 */
export async function savePhotos(item: Item, photos: readonly UploadPhoto[]): Promise<Item | null> {
  const parts = photoParts(photos, item.photos, API_URL);
  if (!photosChanged(parts, item.photos)) {
    return item;
  }
  const body = new FormData();
  for (const part of parts) {
    if ('keep' in part) {
      body.append(PHOTO_PARTS.keep, part.keep);
    } else {
      // React Native's FormData sends a file given by where it is on the phone.
      body.append(PHOTO_PARTS.file, { uri: part.file.url, name: part.file.name, type: part.file.type } as unknown as Blob);
    }
  }
  const response = await fetch(`${API_URL}/items/${item.id}/photos`, { method: 'PUT', body }).catch(() => null);
  return response?.ok ? itemSchema.parse(await response.json()) : null;
}
