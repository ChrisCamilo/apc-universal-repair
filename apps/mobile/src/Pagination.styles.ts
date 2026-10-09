import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { glow } from './styles/shared';
import { fontFamily, softHairline } from './theme';

// The look of the pagination, the same as the web: the page size, the range and the page buttons under a soft hairline,
// wrapping on a phone. The current page fills with the accent and glows where the style has a glow; pressing a page
// shows what hover shows on the web; a button that can't be used dims.

/** A page button that can't be used is drawn at this opacity, as on the web (aria-disabled:opacity-50). */
export const DISABLED_OPACITY = 0.5;

/** The pagination: the bar, the page size, the range, the page buttons, the gaps between them and the numbers. */
export const useStyles = createStyles(
  'common.pagination',
  {
    bar: '',
    size: 'size',
    range: 'range',
    pages: 'pages',
    previous: 'pages.previous',
    gap: 'pages.gap',
    ellipsis: 'pages.gap.ellipsis',
    page: 'pages.page',
    number: 'pages.page.number',
  },
  (theme) => ({
    bar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      columnGap: scales.space.s4,
      rowGap: scales.space.s2,
      paddingTop: scales.space.s3,
      borderTopWidth: scales.hairline,
      borderTopColor: softHairline(theme),
    },
    // The ellipsis in a gap, in the number's face, muted.
    ellipsis: { color: theme.colors.textMuted },
    gap: { justifyContent: 'center', paddingHorizontal: scales.space.s1 / 2 },
    number: { fontFamily: fontFamily(scales.monoFont), fontSize: scales.fontSize.xs, fontVariant: ['tabular-nums'] },
    page: {
      minWidth: scales.space.s6,
      height: scales.space.s6,
      paddingHorizontal: scales.space.s2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: scales.hairline,
      borderColor: softHairline(theme),
      borderRadius: theme.radiusTile,
      backgroundColor: 'transparent',
    },
    pageCurrent: { borderColor: 'transparent', backgroundColor: theme.colors.accent, ...glow(theme) },
    pageDisabled: { opacity: DISABLED_OPACITY },
    pagePressed: { borderColor: theme.colors.accent },
    pages: { flexDirection: 'row', flexWrap: 'wrap', gap: scales.space.s1 },
    // The chevron points right; turned around, it points to the previous page.
    previous: { transform: [{ rotate: '180deg' }] },
    range: {},
    size: { flexDirection: 'row', alignItems: 'center', gap: scales.space.s2 },
  }),
);
