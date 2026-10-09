import { scales } from '@apc/shared/theme';
import { softHairline } from './Panel';
import { createStyles } from './styles/createStyles';
import { fontFamily, withAlpha } from './theme';

// The look of the photo field, the same as the web: the photos as square tiles, the first one marked as the cover,
// each with a remove × on a dark chip that turns to the danger color while pressed; the dashed area to tap, lit in the
// accent while pressed; and the problems in the danger color. The body only stacks the parts, so it adds no level to
// their ids.

/** Thumbnails and the picture beside the drop text are 72px squares. */
export const THUMB_SIZE = scales.space.s8;

/** The photo field: the photos with their cover mark and remove ×, the area to tap and the problems. */
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
    drop: 'drop',
    picture: 'drop.picture',
    text: 'drop.text',
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
      drop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scales.space.s3,
        padding: scales.space.s3,
        borderWidth: scales.hairline,
        borderStyle: 'dashed',
        borderColor: colors.hairline,
        borderRadius: theme.radiusTile,
        backgroundColor: colors.panelRaised,
      },
      dropPressed: { borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, scales.accentSoft) },
      field: { gap: scales.space.s1 / 2 },
      image: { width: '100%', height: '100%' },
      photo: { ...tile, backgroundColor: colors.panelRaised },
      photos: { flexDirection: 'row', flexWrap: 'wrap', gap: scales.space.s2 },
      picture: { ...tile, backgroundColor: colors.panel },
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
      text: { flex: 1, gap: scales.space.s1 / 2 },
    };
  },
);
