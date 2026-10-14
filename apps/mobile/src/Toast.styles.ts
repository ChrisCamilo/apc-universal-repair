import { popShadow, scales } from '@apc/shared/theme';
import { TOAST_KIND_LOOKS, type ToastKind } from '@apc/shared/toast';
import { createStyles } from './styles/createStyles';
import { displayLabel } from './styles/shared';

// The look of a toast, the same as the web: a short message in the display face after its kind's icon, in a pill of
// the kind's status color (green for success, red for errors, blue for info, yellow for warnings) with its text color,
// near the bottom of the screen above the safe area. A toast that leaves sits under the one taking its place.

/** Each kind's pill and message keys. */
export const KIND_STYLES = {
  success: { pill: 'pillSuccess', label: 'labelSuccess' },
  error: { pill: 'pillError', label: 'labelError' },
  info: { pill: 'pillInfo', label: 'labelInfo' },
  warning: { pill: 'pillWarning', label: 'labelWarning' },
} as const satisfies Record<ToastKind, { pill: string; label: string }>;
/** How far above the safe area the toast sits, in px. */
export const TOAST_OFFSET = scales.space.s5;
/** How far below its place a toast starts as it fades in, and ends as it fades out, in px, as on the web (translate-y-2). */
export const TOAST_RISE = scales.space.s2;

/** The toast's spot on the screen, its pill and its message, by kind. */
export const useStyles = createStyles('common.toast', { spot: '', pill: 'message', label: 'message.text' }, (theme) => {
  const { colors } = theme;
  return {
    label: { ...displayLabel(theme, 'xs'), flexShrink: 1, textAlign: 'center' },
    labelError: { color: colors[TOAST_KIND_LOOKS.error.onColor] },
    labelInfo: { color: colors[TOAST_KIND_LOOKS.info.onColor] },
    labelSuccess: { color: colors[TOAST_KIND_LOOKS.success.onColor] },
    labelWarning: { color: colors[TOAST_KIND_LOOKS.warning.onColor] },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scales.space.s2,
      borderRadius: scales.radiusPill,
      paddingHorizontal: scales.space.s4,
      paddingVertical: scales.space.s2,
      boxShadow: popShadow(),
    },
    pillError: { backgroundColor: colors[TOAST_KIND_LOOKS.error.color] },
    pillInfo: { backgroundColor: colors[TOAST_KIND_LOOKS.info.color] },
    pillLeaving: { position: 'absolute', bottom: 0 },
    pillSuccess: { backgroundColor: colors[TOAST_KIND_LOOKS.success.color] },
    pillWarning: { backgroundColor: colors[TOAST_KIND_LOOKS.warning.color] },
    spot: { position: 'absolute', left: scales.space.s4, right: scales.space.s4, alignItems: 'center' },
  };
});
