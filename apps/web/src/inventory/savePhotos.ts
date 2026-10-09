import { itemSchema, type Item } from '@apc/shared/items'
import { PHOTO_PARTS, photoParts, photosChanged } from '@apc/shared/photos'
import { API_BASE } from '../api.ts'
import type { UploadPhoto } from '../components/ImageUpload.tsx'

// Saves an item's photos as a photo field or the viewer holds them: the saved ones kept by their id and the new
// files sent, all in one request, in their order. Nothing is sent when the photos didn't change.

/**
 * Saves an item's photos when they changed, and lets go of the previews of the files sent once they are saved.
 * @param item The item as saved, with its saved photos.
 * @param photos The photos it should have, in order.
 * @returns The item with its photos as the API saved them (the same item when nothing changed), or null when the
 * photos couldn't be saved.
 */
export async function savePhotos(item: Item, photos: readonly UploadPhoto[]): Promise<Item | null> {
  const parts = photoParts(photos, item.photos, API_BASE)
  if (!photosChanged(parts, item.photos)) {
    return item
  }
  const body = new FormData()
  for (const part of parts) {
    if ('keep' in part) {
      body.append(PHOTO_PARTS.keep, part.keep)
    } else {
      body.append(PHOTO_PARTS.file, part.file, part.file.name)
    }
  }
  const response = await fetch(`${API_BASE}/items/${item.id}/photos`, { method: 'PUT', body }).catch(() => null)
  if (!response?.ok) {
    return null
  }
  for (const photo of photos) {
    if (photo.file) {
      URL.revokeObjectURL(photo.url)
    }
  }
  return itemSchema.parse(await response.json())
}
