import { useState } from 'react';
import { Image, Pressable, Text as NativeText, View } from 'react-native';
import { closeIcon, ICON_SIZES, imageIcon } from '@apc/shared/icons';
import { photoCount, takePhotos, type PhotoFile } from '@apc/shared/photos';
import { scales } from '@apc/shared/theme';
import { Icon } from './Icon';
import { useStyles } from './ImageUpload.styles';
import { useTheme } from './theme';
import { Label, Text } from './Typography';

// The photo field of the item form, the same as the web. Photos show as thumbnails, the first one marked as
// the cover, each with an × to remove it. Under them, an area to tap opens the owner's photo picker, which
// may return several photos at once, and says how many more fit; it disappears once the limit is reached.
// Only JPG, PNG and WebP up to 3 MB are taken: photos that break the rule or go past the limit are left out,
// and a message names each one and says why. Read-only, as in the item details, it only shows the photos, or says
// there are none: no ×, no area to tap.

export type PickedPhoto = PhotoFile & { url: string };
/** A photo the field holds: one already saved has only its URL; one just picked also has its file. */
export type UploadPhoto = { url: string; file?: PickedPhoto };
type ImageUploadProps = {
  label: string;
  photos: readonly UploadPhoto[];
  onPhotosChange: (photos: UploadPhoto[]) => void;
  /** Most photos the field holds, e.g. ITEM_PHOTO_LIMIT. */
  limit: number;
  /** Opens the phone's photo picker and resolves with the photos chosen, none when the user cancels. */
  onPick: () => Promise<PickedPhoto[]>;
  /** Only shows the photos; nothing can be added or removed. */
  readOnly?: boolean;
};

export function ImageUpload({ label, photos, onPhotosChange, limit, onPick, readOnly = false }: ImageUploadProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  const [problems, setProblems] = useState<string[]>([]);
  const left = limit - photos.length;

  /** Opens the picker, takes the photos that pass the rules and fit, and says which were left out and why. */
  const pick = async () => {
    const picked = await onPick();
    if (picked.length === 0) {
      return;
    }
    const { accepted, problems: leftOut } = takePhotos(picked, photos.length, limit);
    setProblems(leftOut);
    if (accepted.length > 0) {
      onPhotosChange([...photos, ...accepted.map((file) => ({ url: file.url, file }))]);
    }
  };

  /** Removes a photo and clears the message. */
  const remove = (index: number) => {
    setProblems([]);
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <View accessibilityLabel={label} style={styles.field} testID={ids.field}>
      <Label>{label}</Label>
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
          <Pressable accessibilityRole="button" onPress={pick} style={({ pressed }) => [styles.drop, pressed && styles.dropPressed]} testID={ids.drop}>
            <View style={styles.picture} testID={ids.picture}>
              <Icon icon={imageIcon} size={ICON_SIZES.dropZone} color={colors.textMuted} />
            </View>
            <View style={styles.text} testID={ids.text}>
              <Text size="sm">
                {photos.length > 0 ? `Toque para escolher mais ${photoCount(left)}` : `Toque para escolher até ${photoCount(limit)}`}
              </Text>
              <Text size="sm" tone="muted">
                JPG, PNG ou WebP, até 3 MB cada. A primeira vira a capa na lista.
              </Text>
            </View>
          </Pressable>
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
