import { scales, sheenGradient } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { softHairline } from './theme';

// The look of the surfaces the Dashboard nests, the same as the web: every panel pads its content and has the soft
// hairline; an outer panel takes the panel radius and the top sheen, a nested one the smaller tile radius and no
// sheen, so the highlight isn't stacked; a raised one stands out on the raised fill.

/** A panel: nested or not, raised or not, with the sheen or not. */
export const useStyles = createStyles('common.panel', { panel: '' }, (theme) => ({
  panel: {
    backgroundColor: theme.colors.panel,
    borderWidth: scales.hairline,
    borderColor: softHairline(theme),
    borderRadius: theme.radiusPanel,
    padding: scales.space.s3,
  },
  panelNested: { borderRadius: theme.radiusTile },
  panelRaised: { backgroundColor: theme.colors.panelRaised },
  panelSheen: { backgroundImage: sheenGradient(theme.sheen, theme.mode) },
}));

/** A soft hairline between groups of content. */
export const useDividerStyles = createStyles('common.divider', { divider: '' }, (theme) => ({
  divider: { height: scales.hairline, backgroundColor: softHairline(theme), marginVertical: scales.space.s2, marginHorizontal: scales.space.s1 },
}));
