import { scales } from '@apc/tokens/theme';
import { createStyles } from '../../../styles/createStyles';
import { glow } from '../../../styles/shared';
import { fontFamily, softHairline } from '../../../app/theme';

// The look of the photo picker, the same as the web on a phone: the search on top, then the items found, each a framed
// line at least 56px tall with its cover, name and code and a chevron in the accent that turns down while it is open,
// its photos under it two to a row as 4:3 tiles on the canvas; a checked photo takes the accent frame and a round
// check on the accent at its corner, glowing where the style has a glow, and one that no longer fits is faded. The
// count under the list turns to the warn color once the brand is full.

/** The cover of an item's line, a 44px square. */
const COVER_SIZE = scales.touch.icon;

/** The picker: its body, the items, each item's line and photos, a photo's check, and the notes. */
export const useStyles = createStyles(
  'inventory.photo-picker',
  {
    base: '',
    list: 'list',
    source: 'list.source',
    head: 'list.source.head',
    cover: 'list.source.head.cover',
    text: 'list.source.head.text',
    name: 'list.source.head.text.name',
    code: 'list.source.head.text.code',
    chevron: 'list.source.head.chevron',
    photos: 'list.source.photos',
    photo: 'list.source.photos.photo',
    image: 'list.source.photos.photo.image',
    check: 'list.source.photos.photo.check',
    note: 'note',
    count: 'count',
  },
  (theme) => {
    const { colors } = theme;
    return {
      base: { gap: scales.space.s3 },
      check: {
        position: 'absolute',
        top: scales.space.s1,
        right: scales.space.s1,
        width: scales.space.s5,
        height: scales.space.s5,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scales.radiusPill,
        backgroundColor: colors.accent,
        ...glow(theme),
      },
      chevron: { transform: [{ rotate: '0deg' }] },
      chevronOpen: { transform: [{ rotate: '90deg' }] },
      code: { fontFamily: fontFamily(scales.monoFont), fontSize: scales.fontSize.xs, color: colors.textMuted },
      count: { fontFamily: fontFamily(scales.monoFont), fontSize: scales.fontSize.xs, color: colors.textMuted },
      countFull: { color: colors.warn },
      cover: { width: COVER_SIZE, height: COVER_SIZE, borderRadius: theme.radiusTile, borderWidth: scales.hairline, borderColor: softHairline(theme) },
      head: { minHeight: scales.touch.row, flexDirection: 'row', alignItems: 'center', gap: scales.space.s3, padding: scales.space.s1 },
      headPressed: { backgroundColor: colors.panelRaised },
      image: { width: '100%', height: '100%' },
      list: { gap: scales.space.s2 },
      name: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.base, color: colors.text },
      note: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.sm, color: colors.textMuted },
      photo: {
        width: '48%',
        aspectRatio: 4 / 3,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: softHairline(theme),
        borderRadius: theme.radiusTile,
        backgroundColor: colors.canvas,
      },
      photoChecked: { borderColor: colors.accent },
      photoDisabled: { opacity: 0.45 },
      photos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: scales.space.s2, paddingHorizontal: scales.space.s1, paddingBottom: scales.space.s1 },
      source: { gap: scales.space.s2, padding: scales.space.s1, borderWidth: scales.hairline, borderColor: softHairline(theme), borderRadius: theme.radiusTile },
      text: { flex: 1, minWidth: 0, gap: scales.space.s1 / 2 },
    };
  },
);
