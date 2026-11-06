import { useState } from 'react';
import { Image, Pressable, Text as NativeText, View } from 'react-native';
import { cameraIcon, closeIcon, ICON_SIZES, imageIcon, type IconShape } from '@apc/tokens/icons';
import { takePhotos, type PhotoFile } from '@apc/domain/photos';
import { scales } from '@apc/tokens/theme';
import { Icon } from '../Icon/Icon';
import { useStyles } from './ImageUpload.styles';
import { useTheme } from '../../app/theme';
import { Label, Text } from '../Typography/Typography';

// The photo field of the item form, the same as the web on a phone. Photos show as thumbnails, the first one marked
// as the cover, each with an × to remove it. The label says how many fit, and under the photos Tirar foto opens the
// owner's camera and Galeria the owner's photo picker, which may return several photos at once; both disappear once
// the limit is reached. Only JPG, PNG and WebP up to 3 MB are taken: photos that break the rule or go past the limit
// are left out, and a message names each one and says why. Read-only, as in the item details, it only shows the
// photos, or says there are none: no ×, no buttons.

export type PickedPhoto = PhotoFile & { url: string };
/**
 * A photo the field holds: one already saved has only its URL; one just picked also has its file; one of another item,
 * to be copied, also has that photo's id.
 */
export type UploadPhoto = { url: string; file?: PickedPhoto; copyOf?: string };
type ImageUploadProps = {
  label: string;
  photos: readonly UploadPhoto[];
  onPhotosChange: (photos: UploadPhoto[]) => void;
  /** Most photos the field holds, e.g. ITEM_PHOTO_LIMIT. */
  limit: number;
  /** Opens the phone's photo picker and resolves with the photos chosen, none when the user cancels. */
  onPick: () => Promise<PickedPhoto[]>;
  /** Opens the phone's camera and resolves with the photo taken, none when the user cancels. */
  onTake: () => Promise<PickedPhoto[]>;
  /** Only shows the photos; nothing can be added or removed. */
  readOnly?: boolean;
};

export function ImageUpload({ label, photos, onPhotosChange, limit, onPick, onTake, readOnly = false }: ImageUploadProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  const [problems, setProblems] = useState<string[]>([]);
  const left = limit - photos.length;

  /**
   * Opens the picker or the camera, takes the photos that pass the rules and fit, and says which were left out and why.
   * @param open Opens the picker or the camera.
   */
  const add = async (open: () => Promise<PickedPhoto[]>) => {
    const picked = await open();
    if (picked.length === 0) {
      return;
    }
    const { accepted, problems: leftOut } = takePhotos(picked, photos.length, limit);
    setProblems(leftOut);
    if (accepted.length > 0) {
      onPhotosChange([...photos, ...accepted.map((file) => ({ url: file.url, file }))]);
    }
  };

  /**
   * A button that opens the camera or the picker.
   * @param text What it says, its name too.
   * @param icon Its icon.
   * @param open Opens the camera or the picker.
   */
  const picker = (text: string, icon: IconShape[], open: () => Promise<PickedPhoto[]>) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => add(open)}
      style={({ pressed }) => [styles.picker, pressed && styles.pickerPressed]}
      testID={ids.picker}
    >
      {({ pressed }) => (
        <>
          <Icon icon={icon} size={ICON_SIZES.thumbnail} color={pressed ? colors.accent : colors.text} />
          <NativeText style={[styles.pickerText, pressed && styles.pickerTextPressed]} testID={ids.pickerText}>
            {text}
          </NativeText>
        </>
      )}
    </Pressable>
  );

  /** Removes a photo and clears the message. */
  const remove = (index: number) => {
    setProblems([]);
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <View accessibilityLabel={label} style={styles.field} testID={ids.field}>
      <Label>{readOnly ? label : `${label} · até ${limit}`}</Label>
      <View style={styles.body} testID={ids.body}>
        {photos.length > 0 && (
          <View style={styles.photos} testID={ids.photos}>
            {photos.map((photo, index) => (
              <View key={photo.url} style={styles.photo} testID={ids.photo}>
                <Image
                  source={{ uri: photo.url }}
                  resizeMode="cover"
                  accessibilityLabel={`Foto ${index + 1}${index === 0 ? ', capa' : ''}`}
                  style={styles.image}
                  testID={ids.image}
                />
                {index === 0 && (
                  <View style={styles.cover} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden testID={ids.cover}>
                    <NativeText style={styles.coverText} testID={ids.coverText}>
                      capa
                    </NativeText>
                  </View>
                )}
                {!readOnly && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remover foto ${index + 1}`}
                    hitSlop={scales.space.s2}
                    onPress={() => remove(index)}
                    style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}
                    testID={ids.remove}
                  >
                    {({ pressed }) => <Icon icon={closeIcon} size={ICON_SIZES.mark} color={pressed ? colors.onDanger : colors.text} />}
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
        {readOnly && photos.length === 0 && <Text tone="muted">Sem fotos</Text>}
        {!readOnly && left > 0 && (
          <View style={styles.pickers} testID={ids.pickers}>
            {picker('Tirar foto', cameraIcon, onTake)}
            {picker('Galeria', imageIcon, onPick)}
          </View>
        )}
        {problems.length > 0 && (
          <View accessibilityLiveRegion="polite" style={styles.problems} testID={ids.problems}>
            {problems.map((problem) => (
              <NativeText key={problem} style={styles.problem} testID={ids.problem}>
                {problem}
              </NativeText>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
