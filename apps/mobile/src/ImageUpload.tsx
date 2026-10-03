import { useState } from 'react';
import { Image, Pressable, Text as NativeText, View, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { closeIcon, imageIcon } from '@apc/shared/icons';
import { photoCount, takePhotos, type PhotoFile } from '@apc/shared/photos';
import { scales } from '@apc/shared/theme';
import { Icon } from './Icon';
import { softHairline } from './Panel';
import { fontFamily, useTheme, withAlpha, type ActiveTheme } from './theme';
import { Label, Text } from './Typography';

// The photo field of the item form, the same as the web. Photos show as thumbnails, the first one marked as
// the cover, each with an × to remove it. Under them, an area to tap opens the owner's photo picker, which
// may return several photos at once, and says how many more fit; it disappears once the limit is reached.
// Only JPG, PNG and WebP up to 3 MB are taken: photos that break the rule or go past the limit are left out,
// and a message names each one and says why.

const COVER_STYLE: ViewStyle = { position: 'absolute', left: scales.space.s1, bottom: scales.space.s1 };
const IMAGE_STYLE: ImageStyle = { width: '100%', height: '100%' };
const NOTES_STYLE: ViewStyle = { gap: scales.space.s1 / 2 };
// The × button: a 24px circle in the top right corner, centered on its icon.
const REMOVE_STYLE: ViewStyle = {
  position: 'absolute',
  top: scales.space.s1,
  right: scales.space.s1,
  width: scales.space.s5,
  height: scales.space.s5,
  alignItems: 'center',
  justifyContent: 'center',
};
const ROW_STYLE: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: scales.space.s2 };
const TEXT_STYLE: ViewStyle = { flex: 1, gap: scales.space.s1 / 2 };
// Thumbnails and the picture beside the drop text are 72px squares.
const THUMB_SIZE = scales.space.s8;

/** A photo the picker returned: where it is on the phone, with what the rules check. */
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
};

/**
 * Styles the small pill drawn over a thumbnail, the cover tag or the remove button: the canvas, see-through.
 * @param theme Active theme.
 * @param pressed Whether it is being pressed; the remove button then turns danger.
 * @returns Style for the pill View.
 */
function chipStyle(theme: ActiveTheme, pressed = false): ViewStyle {
  return {
    borderRadius: scales.radiusPill,
    backgroundColor: pressed ? theme.colors.danger : withAlpha(theme.colors.canvas, scales.backdrop.opacity),
  };
}

/**
 * Styles the "capa" tag: small mono text in the text color.
 * @param theme Active theme.
 * @returns Style for the tag Text.
 */
function coverTextStyle(theme: ActiveTheme): TextStyle {
  return {
    fontFamily: fontFamily(scales.monoFont),
    fontSize: scales.fontSize.xs,
    paddingHorizontal: scales.space.s1,
    color: theme.colors.text,
  };
}

/**
 * Styles the area to tap: a dashed hairline on the raised fill, lit in the accent while pressed.
 * @param theme Active theme.
 * @param pressed Whether it is being pressed.
 * @returns Style for the area Pressable.
 */
function dropStyle(theme: ActiveTheme, pressed: boolean): ViewStyle {
  const { colors } = theme;
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scales.space.s3,
    padding: scales.space.s3,
    borderWidth: scales.hairline,
    borderStyle: 'dashed',
    borderColor: pressed ? colors.accent : colors.hairline,
    borderRadius: theme.radiusTile,
    backgroundColor: pressed ? withAlpha(colors.accent, scales.accentSoft) : colors.panelRaised,
  };
}

/**
 * Styles a message about a photo left out: small text in the danger color.
 * @param theme Active theme.
 * @returns Style for the message Text.
 */
function problemStyle(theme: ActiveTheme): TextStyle {
  return { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.sm, color: theme.colors.danger };
}

/**
 * Styles a square tile: a thumbnail, or the picture beside the drop text.
 * @param theme Active theme.
 * @param fill Background color.
 * @returns Style for the tile View.
 */
function tileStyle(theme: ActiveTheme, fill: string): ViewStyle {
  return {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: scales.hairline,
    borderColor: softHairline(theme),
    borderRadius: theme.radiusTile,
    backgroundColor: fill,
  };
}

export function ImageUpload({ label, photos, onPhotosChange, limit, onPick }: ImageUploadProps) {
  const theme = useTheme();
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
    <View accessibilityLabel={label} style={NOTES_STYLE}>
      <Label>{label}</Label>
      <View style={NOTES_STYLE}>
        {photos.length > 0 && (
          <View style={ROW_STYLE}>
            {photos.map((photo, index) => (
              <View key={photo.url} style={tileStyle(theme, theme.colors.panelRaised)} testID="upload-photo">
                <Image
                  source={{ uri: photo.url }}
                  resizeMode="cover"
                  accessibilityLabel={`Foto ${index + 1}${index === 0 ? ', capa' : ''}`}
                  style={IMAGE_STYLE}
                />
                {index === 0 && (
                  <View style={[COVER_STYLE, chipStyle(theme)]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                    <NativeText style={coverTextStyle(theme)}>capa</NativeText>
                  </View>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover foto ${index + 1}`}
                  hitSlop={scales.space.s2}
                  onPress={() => remove(index)}
                  style={({ pressed }) => [REMOVE_STYLE, chipStyle(theme, pressed)]}
                >
                  {({ pressed }) => <Icon icon={closeIcon} size={10} color={pressed ? theme.colors.onDanger : theme.colors.text} />}
                </Pressable>
              </View>
            ))}
          </View>
        )}
        {left > 0 && (
          <Pressable accessibilityRole="button" onPress={pick} style={({ pressed }) => dropStyle(theme, pressed)} testID="upload-drop">
            <View style={tileStyle(theme, theme.colors.panel)}>
              <Icon icon={imageIcon} size={22} color={theme.colors.textMuted} />
            </View>
            <View style={TEXT_STYLE}>
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
          <View accessibilityLiveRegion="polite" style={NOTES_STYLE}>
            {problems.map((problem) => (
              <NativeText key={problem} style={problemStyle(theme)}>
                {problem}
              </NativeText>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
