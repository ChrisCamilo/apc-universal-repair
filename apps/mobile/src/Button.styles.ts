import { BUTTON_SIZES } from '@apc/shared/button';
import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { displayLabel, glow } from './styles/shared';
import { fontFamily, withAlpha } from './theme';

// The look of the buttons, the same variants and sizes as the web (see @apc/shared/button): pill shape and the display
// face in uppercase with the style's tracking, except the link, which reads as inline text. Pressing shows what hover
// shows on the web; a focus ring frames the button when it has keyboard focus. Each variant has its frame and label
// keys, and a `Pressed` one where pressing changes it.

/** A disabled or loading button is drawn at this opacity, as on the web (disabled:opacity-50). */
export const DISABLED_OPACITY = 0.5;
/** How far past a link's text a press still lands, in px: its 20px line reaches the 44px a finger needs. */
export const LINK_HIT_SLOP = scales.space.s3;
/** A pressed filled button (primary, danger) is drawn at this opacity, as the web mixes 86% of its fill on hover. */
export const PRESSED_FILLED_OPACITY = 0.86;

/** A button: the focus ring around it, where it sits, its frame and its label, by variant, size and state. */
export const useStyles = createStyles('common.button', { frame: '', ring: 'ring', label: 'label' }, (theme) => {
  const { colors } = theme;
  return {
    frame: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scales.space.s2,
      borderRadius: scales.radiusPill,
      borderWidth: scales.hairline,
      borderColor: 'transparent',
      backgroundColor: 'transparent',
    },
    frameDanger: { backgroundColor: colors.danger },
    frameDisabled: { opacity: DISABLED_OPACITY },
    frameGhostPressed: { backgroundColor: colors.panelRaised },
    frameLink: { minHeight: 0, paddingHorizontal: 0, paddingVertical: 0 },
    frameMd: { minHeight: scales.touch.button, paddingHorizontal: scales.space[BUTTON_SIZES.md.padX], paddingVertical: scales.space[BUTTON_SIZES.md.padY] },
    framePressed: { transform: [{ translateY: 1 }] },
    framePressedFilled: { opacity: PRESSED_FILLED_OPACITY },
    framePrimary: { backgroundColor: colors.accent, ...glow(theme) },
    frameSecondary: { borderColor: colors.hairline },
    frameSecondaryPressed: { borderColor: colors.accent },
    frameSm: { minHeight: scales.touch.buttonSm, paddingHorizontal: scales.space[BUTTON_SIZES.sm.padX], paddingVertical: scales.space[BUTTON_SIZES.sm.padY] },
    label: displayLabel(theme, BUTTON_SIZES.md.fontSize),
    labelDanger: { color: colors.onDanger },
    labelLink: { fontFamily: fontFamily(scales.bodyFont), textTransform: 'none', letterSpacing: 0, textDecorationLine: 'underline', color: colors.textMuted },
    labelLinkPressed: { color: colors.accent },
    labelPrimary: { color: colors.onAccent },
    labelSecondaryPressed: { color: colors.accent },
    labelSm: displayLabel(theme, BUTTON_SIZES.sm.fontSize),
    ring: {
      alignSelf: 'flex-start',
      borderRadius: scales.radiusPill,
      borderWidth: scales.focusRing.width,
      borderColor: 'transparent',
    },
    ringEnd: { alignSelf: 'flex-end' },
    ringFocused: { borderColor: withAlpha(colors.accent, scales.focusRing.opacity) },
    ringStretch: { alignSelf: 'stretch' },
  };
});
