import { popShadow, scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { displayLabel } from './styles/shared';

// The look of a toast, the same as the web: a short message in the display face, in the canvas color on the text
// color, in a pill near the bottom of the screen above the safe area.

/** How far above the safe area the toast sits, in px. */
export const TOAST_OFFSET = scales.space.s5;

/** The toast's spot on the screen, its pill and its message. */
export const useStyles = createStyles('common.toast', { spot: '', pill: 'message', label: 'message.text' }, (theme) => ({
  label: { ...displayLabel(theme, 'xs'), textAlign: 'center', color: theme.colors.canvas },
  pill: {
    borderRadius: scales.radiusPill,
    backgroundColor: theme.colors.text,
    paddingHorizontal: scales.space.s4,
    paddingVertical: scales.space.s2,
    boxShadow: popShadow(),
  },
  spot: { position: 'absolute', left: scales.space.s4, right: scales.space.s4, alignItems: 'center' },
}));
