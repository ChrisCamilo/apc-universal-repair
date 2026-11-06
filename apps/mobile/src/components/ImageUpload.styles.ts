import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';
import { fontFamily, softAccent, softHairline, withAlpha } from '../theme';

// The look of the photo field, the same as the web: the photos as square tiles, the first one marked as the cover,
// each with a remove × on a dark chip that turns to the danger color while pressed; Tirar foto and Galeria sharing a
// row, each a 48px framed button with its icon, lit in the accent while pressed; and the problems in the danger color.
// The body only stacks the parts, so it adds no level to their ids.

/** Thumbnails are 72px squares. */
export const THUMB_SIZE = scales.space.s8;

/** The photo field: the photos with their cover mark and remove ×, Tirar foto and Galeria, and the problems. */
export const useStyles = createStyles(
  'common.image-upload',
  {
    field: '',
    body: 'body',
    photos: 'photos',
    photo: 'photos.photo',
    image: 'photos.photo.image',
    cover: 'photos.photo.cover',
    coverText: 'photos.photo.cover.text',
    remove: 'photos.photo.remove',
    pickers: 'pickers',
    picker: 'pickers.picker',
    pickerText: 'pickers.picker.text',
    problems: 'problems',
    problem: 'problems.problem',
  },
  (theme) => {
    const { colors } = theme;
    const tile = {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: scales.hairline,
      borderColor: softHairline(theme),
      borderRadius: theme.radiusTile,
    } as const;
    const chip = { borderRadius: scales.radiusPill, backgroundColor: withAlpha(colors.canvas, scales.backdrop.opacity) };
    return {
      body: { gap: scales.space.s1 / 2 },
      cover: { ...chip, position: 'absolute', left: scales.space.s1, bottom: scales.space.s1 },
      coverText: { fontFamily: fontFamily(scales.monoFont), fontSize: scales.fontSize.xs, paddingHorizontal: scales.space.s1, color: colors.text },
      field: { gap: scales.space.s1 / 2 },
      image: { width: '100%', height: '100%' },
      photo: { ...tile, backgroundColor: colors.panelRaised },
      photos: { flexDirection: 'row', flexWrap: 'wrap', gap: scales.space.s2 },
      picker: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scales.space.s2,
        height: scales.space.s7,
        borderWidth: scales.hairline,
        borderColor: colors.hairline,
        borderRadius: theme.radiusTile,
        backgroundColor: colors.panel,
      },
      pickerPressed: { borderColor: colors.accent, backgroundColor: softAccent(theme) },
      pickerText: { fontFamily: fontFamily(scales.bodyFont, 500), fontSize: scales.fontSize.base, color: colors.text },
      pickerTextPressed: { color: colors.accent },
      pickers: { flexDirection: 'row', gap: scales.space.s2 },
      problem: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.sm, color: colors.danger },
      problems: { gap: scales.space.s1 / 2 },
      // The ×: a 24px circle in the top right corner, centered on its icon.
      remove: {
        ...chip,
        position: 'absolute',
        top: scales.space.s1,
        right: scales.space.s1,
        width: scales.space.s5,
        height: scales.space.s5,
        alignItems: 'center',
        justifyContent: 'center',
      },
      removePressed: { backgroundColor: colors.danger },
    };
  },
);
