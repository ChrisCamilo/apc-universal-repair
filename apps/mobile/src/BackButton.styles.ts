import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';

// The look of the ←, the same as the web: a bare 44px circle around the arrow, as tall as a finger needs, that fills in
// while pressed, its arrow in the accent.

/** The round ← that goes back a screen. */
export const useStyles = createStyles('common.back-button', { round: '' }, (theme) => ({
  round: {
    width: scales.touch.icon,
    height: scales.touch.icon,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scales.radiusPill,
  },
  roundPressed: { backgroundColor: theme.colors.panelRaised },
}));
