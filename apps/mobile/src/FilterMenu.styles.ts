import { FILTER_PANEL_SPACING } from '@apc/shared/filters';
import { popShadow, scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { displayLabel } from './styles/shared';
import { fontFamily, softHairline, withAlpha } from './theme';

// The look of the filter menu, the same as the web: a pill trigger in the display face that lights up in the accent
// while filters are on, with their count in an accent badge, and a panel of labeled rows, each a set of chips or a
// select, with Limpar and Aplicar under a hairline. The panel is FILTER_PANEL_SPACING wide, as on the web.

/** The room the panel leaves on a narrow screen, in px. */
export const PANEL_INSET = FILTER_PANEL_SPACING.inset * scales.space.s1;
/** The panel's widest size, in px. */
export const PANEL_MAX_WIDTH = FILTER_PANEL_SPACING.width * scales.space.s1;

/** A filter menu: the trigger with its label and count, the backdrop, the panel, a row and its chips, and the actions. */
export const useStyles = createStyles(
  'common.filter-menu',
  {
    trigger: 'trigger',
    triggerLabel: 'trigger.label',
    count: 'trigger.count',
    backdrop: 'backdrop',
    panel: 'panel',
    row: 'panel.row',
    chips: 'panel.row.chips',
    actions: 'panel.actions',
  },
  (theme) => {
    const { colors } = theme;
    return {
      actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: scales.space.s2,
        borderTopWidth: scales.hairline,
        borderTopColor: softHairline(theme),
        paddingTop: scales.space.s2,
      },
      backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
      chips: { flexDirection: 'row', flexWrap: 'wrap', columnGap: scales.space.s4, rowGap: scales.space.s2 },
      content: { gap: scales.space.s3 },
      count: {
        minWidth: scales.space.s4,
        paddingHorizontal: scales.space.s1,
        borderRadius: scales.radiusPill,
        overflow: 'hidden',
        textAlign: 'center',
        fontFamily: fontFamily(scales.monoFont, 500),
        fontSize: scales.fontSize.xs,
        color: colors.onAccent,
        backgroundColor: colors.accent,
      },
      panel: { alignSelf: 'center', marginTop: scales.space.s8, borderRadius: theme.radiusPanel, boxShadow: popShadow() },
      row: { gap: scales.space.s1 },
      trigger: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: scales.space.s2,
        borderWidth: scales.hairline,
        borderColor: colors.hairline,
        borderRadius: scales.radiusPill,
        backgroundColor: 'transparent',
        paddingHorizontal: scales.space.s4,
        paddingVertical: scales.space.s2,
      },
      triggerActive: { borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, scales.accentSoft) },
      triggerLabel: displayLabel(theme, 'xs'),
      triggerLabelActive: { color: colors.accent },
    };
  },
);
