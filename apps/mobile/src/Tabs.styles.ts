import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { displayLabel, glow } from './styles/shared';
import { fontFamily, withAlpha } from './theme';

// The look of the tabs, the same as the web: labels in the muted display face, the selected one in the accent over an
// accent underline that glows where the style has a glow; pressing shows what hover shows on the web; a count in a pill
// that turns to the accent on the selected tab. While a tab is dragged it shows through, and an accent line marks the
// side of the tab under the finger where it will land.

/** The count's frame on the selected tab: the accent at this opacity, as on the web. */
export const COUNT_BORDER_OPACITY = 0.45;
/** A tab being dragged shows through at this opacity, as on the web. */
export const DRAGGING_OPACITY = 0.45;
/** The underline's height, and the drop line's width, in px. */
export const UNDERLINE_HEIGHT = 2 * scales.hairline;

/** The tab list, a tab with its label, count and underline, and the drop line, by state. */
export const useStyles = createStyles(
  'common.tabs',
  { list: '', tab: 'tab', label: 'tab.label', count: 'tab.count', underline: 'tab.underline', drop: 'tab.drop' },
  (theme) => {
    const { colors } = theme;
    return {
      count: {
        fontFamily: fontFamily(scales.monoFont, 500),
        fontSize: scales.fontSize.xs,
        fontVariant: ['tabular-nums'],
        color: colors.textMuted,
        borderWidth: scales.hairline,
        borderColor: colors.hairline,
        borderRadius: scales.radiusPill,
        paddingHorizontal: scales.space.s2,
        overflow: 'hidden',
      },
      countSelected: { color: colors.accent, borderColor: withAlpha(colors.accent, COUNT_BORDER_OPACITY) },
      drop: { position: 'absolute', top: 0, bottom: 0, width: UNDERLINE_HEIGHT, backgroundColor: colors.accent },
      dropAfter: { right: 0 },
      dropBefore: { left: 0 },
      label: { ...displayLabel(theme, 'sm'), color: colors.textMuted },
      labelPressed: { color: colors.text },
      labelSelected: { color: colors.accent },
      list: { flexDirection: 'row', gap: scales.space.s1 },
      tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scales.space.s2,
        paddingHorizontal: scales.space.s3,
        paddingVertical: scales.space.s3,
      },
      tabDragging: { opacity: DRAGGING_OPACITY },
      underline: {
        position: 'absolute',
        left: scales.space.s3,
        right: scales.space.s3,
        bottom: -scales.hairline,
        height: UNDERLINE_HEIGHT,
        borderRadius: scales.radiusPill,
        backgroundColor: 'transparent',
      },
      underlineSelected: { backgroundColor: colors.accent, ...glow(theme) },
    };
  },
);
