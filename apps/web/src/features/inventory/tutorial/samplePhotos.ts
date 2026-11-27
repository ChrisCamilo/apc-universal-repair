import { TUTORIAL_SAMPLE_PHOTOS } from '@apc/domain/photos-tutorial'
import type { UploadPhoto } from '../../../components/ImageUpload'
import firstSample from './samples/tutorial-photo-1.jpg'
import secondSample from './samples/tutorial-photo-2.jpg'

// The sample photos the photos tour's "Fazer por mim" adds, which the app carries, as files the photo field holds, the
// same as photos the user chose.

/**
 * Reads the sample photos as files the photo field holds, each with its preview.
 * @returns The photos, in order.
 */
export async function samplePhotos(): Promise<UploadPhoto[]> {
  return Promise.all(
    [firstSample, secondSample].map(async (url, index) => {
      const blob = await fetch(url).then((response) => response.blob())
      const file = new File([blob], TUTORIAL_SAMPLE_PHOTOS[index], { type: 'image/jpeg' })
      return { url: URL.createObjectURL(file), file }
    }),
  )
}
