import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';

// The look of the spinner, the same as the web: a two-hairline ring open on its right side, in the muted text color
// unless the holder gives its own. "sm" matches body text, "md" stands on its own.

/** The ring's width and height by size, in px. */
export const SPINNER_SIZES = { sm: scales.fontSize.base, md: scales.space.s5 };

/** The spinner's ring, by size. */
export const useStyles = createStyles('common.spinner', { ring: '' }, (theme) => ({
  ring: {
    borderWidth: scales.hairline * 2,
    borderColor: theme.colors.textMuted,
    borderRightColor: 'transparent',
    borderRadius: scales.radiusPill,
  },
  // The open side, again after a holder's color.
  ringGap: { borderRightColor: 'transparent' },
  ringMd: { width: SPINNER_SIZES.md, height: SPINNER_SIZES.md },
  ringSm: { width: SPINNER_SIZES.sm, height: SPINNER_SIZES.sm },
}));
