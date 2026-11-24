import { scales } from '@apc/tokens/theme';
import { createStyles } from '../../styles/createStyles';

// The look of the app's lock: the whole screen on the canvas, as the login's, the brand mark, the title, what it says
// and Desbloquear across it, centered in a column, clear of the phone's bars.

/** The lock: the screen, and its centered column. */
export const useStyles = createStyles('auth.app-lock', { base: '', column: 'column' }, (theme) => ({
  base: { flex: 1, justifyContent: 'center', backgroundColor: theme.colors.canvas },
  column: { alignItems: 'center', gap: scales.space.s4, paddingHorizontal: scales.space.s6 },
}));
