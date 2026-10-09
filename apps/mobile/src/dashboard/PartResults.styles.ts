import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';
import { fontFamily, withAlpha } from '../theme';

// The look of the parts a Catalog search by code found, the same as the web: a box in the soft accent, its parts
// clear at rest, the panel fill while pressed, and the chosen one with the accent frame on the panel fill.

/** The box's frame: the accent at this opacity, as on the web (border-accent/45). */
export const FRAME_OPACITY = 0.45;

/** The found parts: the box, the radio group and each part with its code line and code. */
export const useStyles = createStyles(
  'catalog.part-results',
  { box: '', list: 'list', part: 'list.part', line: 'list.part.line', code: 'list.part.line.code' },
  (theme) => ({
    box: {
      gap: scales.space.s1,
      padding: scales.space.s3,
      borderWidth: scales.hairline,
      borderColor: withAlpha(theme.colors.accent, FRAME_OPACITY),
      borderRadius: theme.radiusTile,
      backgroundColor: withAlpha(theme.colors.accent, scales.accentSoft),
    },
    code: { fontFamily: fontFamily(scales.monoFont), fontSize: scales.fontSize.xs, color: theme.colors.accent },
    line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: scales.space.s2 },
    list: { gap: scales.space.s1 },
    part: {
      gap: scales.space.s1 / 2,
      paddingHorizontal: scales.space.s2,
      paddingVertical: scales.space.s2,
      borderWidth: scales.hairline,
      borderColor: 'transparent',
      borderRadius: theme.radiusTile,
    },
    partChosen: { borderColor: theme.colors.accent, backgroundColor: theme.colors.panel },
    partPressed: { backgroundColor: theme.colors.panel },
  }),
);
