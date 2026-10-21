import { launchImageLibrary, type PhotoQuality } from 'react-native-image-picker';
import { apiFetch } from '@apc/shared/auth';
import { itemSchema, type Item, type ItemBrand } from '@apc/shared/items';
import {
  ITEM_PHOTO_LIMIT,
  PHOTO_MAX_DIMENSION,
  PHOTO_PARTS,
  PHOTO_QUALITY,
  photoParts,
  photosChanged,
} from '@apc/shared/photos';
import { API_URL } from '../api';
import type { PickedPhoto, UploadPhoto } from '../ImageUpload';

// The item photos on the phone: the photo library to pick them from, which hands them over already reduced to
// PHOTO_MAX_DIMENSION at PHOTO_QUALITY, so less is sent and a photo over 3 MB can still be taken; and saving the photos
// of an item's brand as a photo field or the viewer holds them, the same as the web: the saved ones kept by their id and the new
// files sent, all in one request, in their order, and nothing sent when the photos didn't change.

/**
 * Opens the phone's photo library to pick up to ITEM_PHOTO_LIMIT photos, reduced to PHOTO_MAX_DIMENSION.
 * @returns The photos chosen, as reduced, with what the photo rules check; none when the user cancels.
 */
export async function pickPhotos(): Promise<PickedPhoto[]> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: ITEM_PHOTO_LIMIT,
    maxWidth: PHOTO_MAX_DIMENSION,
    maxHeight: PHOTO_MAX_DIMENSION,
    quality: (PHOTO_QUALITY / 100) as PhotoQuality,
  });
  return (result.assets ?? []).flatMap((asset) =>
    asset.uri ? [{ url: asset.uri, name: asset.fileName ?? 'foto', type: asset.type ?? '', size: asset.fileSize ?? 0 }] : [],
  );
}

/**
 * Saves the photos of an item's brand when they changed.
 * @param item The item as saved.
 * @param brand Its brand, with its saved photos.
 * @param photos The photos the brand should have, in order.
 * @returns The item with its photos as the API saved them (the same item when nothing changed), or null when the
 * photos couldn't be saved.
 */
export async function savePhotos(item: Item, brand: ItemBrand, photos: readonly UploadPhoto[]): Promise<Item | null> {
  const parts = photoParts(photos, brand.photos, API_URL);
  if (!photosChanged(parts, brand.photos)) {
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
  const response = await apiFetch(`${API_URL}/items/${item.id}/brands/${brand.id}/photos`, { method: 'PUT', body }).catch(() => null);
  return response?.ok ? itemSchema.parse(await response.json()) : null;
}
