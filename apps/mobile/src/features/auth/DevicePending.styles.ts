import { scales } from '@apc/tokens/theme';
import { createStyles } from '../../styles/createStyles';
import { fontFamily, softHairline } from '../../app/theme';

// The look of the notice of a phone waiting for authorization, above the login or sign-up form, as the web's: a soft
// tile with the message, the phone's short code large in the mono face, spaced to read out, and what to do on the
// server's computer.

/** The notice: its tile, and the code. */
export const useStyles = createStyles('auth.device-pending', { base: '', code: 'code' }, (theme) => ({
  base: {
    gap: scales.space.s2,
    padding: scales.space.s4,
    borderRadius: theme.radiusTile,
    borderWidth: 1,
    borderColor: softHairline(theme),
    backgroundColor: theme.colors.panelRaised,
  },
  code: {
    fontFamily: fontFamily(scales.monoFont, 500),
    fontSize: 24,
    letterSpacing: 24 * 0.3,
    color: theme.colors.text,
  },
}));
