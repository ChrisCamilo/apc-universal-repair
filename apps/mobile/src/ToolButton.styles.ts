import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { roundStyles } from './styles/shared';
import { softAccent } from './theme';

// The look of a round icon button in a phone's toolbar, the same as the web: a 44px pill on the panel with a hairline,
// its frame in the accent while pressed. While what it opens is on, such as a filter, it takes the accent, its fill the
// soft accent, with a dot at its top right.

/** A round toolbar button and its dot, at rest or on. */
export const useStyles = createStyles('common.tool-button', { round: '', dot: 'dot' }, (theme) => ({
  ...roundStyles(theme, scales.touch.icon),
  dot: {
    position: 'absolute',
    top: scales.space.s1,
    right: scales.space.s1,
    width: scales.space.s2,
    height: scales.space.s2,
    borderRadius: scales.radiusPill,
    backgroundColor: theme.colors.accent,
  },
  roundActive: { borderColor: theme.colors.accent, backgroundColor: softAccent(theme) },
}));
