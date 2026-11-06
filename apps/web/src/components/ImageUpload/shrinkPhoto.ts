import { fitPhoto, PHOTO_MAX_BYTES, PHOTO_QUALITY, PHOTO_TYPES } from '@apc/shared/photos'

// Reduces a chosen photo in the browser before it is sent, so less goes up and a photo over 3 MB can still be taken:
// drawn upright (as the camera meant) in a canvas fitted to PHOTO_MAX_DIMENSION, then saved as WebP at PHOTO_QUALITY,
// or as JPEG where the browser can't write WebP. A photo that already fits and is under 3 MB is left as it is, and
// so is a file the browser can't read as an image, for the photo rules to name it.

/** Formats tried in order: WebP, then JPEG for browsers that can't write WebP (they hand back a PNG instead). */
const OUTPUT_TYPES = [
  { type: 'image/webp', ext: 'webp' },
  { type: 'image/jpeg', ext: 'jpg' },
] as const

/**
 * Reduces a chosen photo when it is larger than PHOTO_MAX_DIMENSION or 3 MB.
 * @param file The file chosen or dropped.
 * @returns The reduced photo, named after the file with its new extension, or the same file when it already fits,
 * can't be read, or wouldn't get smaller.
 */
export async function shrinkPhoto(file: File): Promise<File> {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) {
    return file
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null)
  if (!bitmap) {
    return file
  }
  const { width, height } = fitPhoto(bitmap.width, bitmap.height)
  if (width === bitmap.width && height === bitmap.height && file.size <= PHOTO_MAX_BYTES) {
    bitmap.close()
    return file
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  for (const { type, ext } of OUTPUT_TYPES) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, PHOTO_QUALITY / 100))
    if (blob?.type === type) {
      return blob.size < file.size ? new File([blob], `${file.name.replace(/\.[^.]*$/, '')}.${ext}`, { type }) : file
    }
  }
  return file
}
