import { TUTORIAL_SAMPLE_PHOTOS } from '@apc/domain/photos-tutorial';
import type { UploadPhoto } from '../../../components/ImageUpload';

// The sample photos the photos tour's "Fazer por mim" adds, which the app carries as raw resources
// (android/app/src/main/res/raw), as photos the photo field holds, the same as photos picked: shown and sent from
// their resource address, which the phone reads like a picked photo's.

// Each sample's resource and size in bytes.
const SAMPLES = [
  { resource: 'tutorial_photo_1', size: 9841 },
  { resource: 'tutorial_photo_2', size: 9158 },
];

/**
 * Lists the sample photos as photos the photo field holds.
 * @returns The photos, in order.
 */
export function samplePhotos(): UploadPhoto[] {
  return SAMPLES.map(({ resource, size }, index) => {
    const url = `android.resource://com.apc.universalrepair/raw/${resource}`;
    return { url, file: { url, name: TUTORIAL_SAMPLE_PHOTOS[index], type: 'image/jpeg', size } };
  });
}
