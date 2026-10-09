import type { TextStyle, ViewStyle } from 'react-native';
import { SELECT_VISIBLE_OPTIONS } from '@apc/shared/filters';
import { scales } from '@apc/shared/theme';
import { softHairline } from '../Panel';
import { fontFamily, withAlpha, type ActiveTheme } from '../theme';

// The style recipes three or more components share, the same patterns as the web's styles/shared.ts. Each gives
// styles a component's createStyles() spreads into its own, so the shared keys sit beside the component's keys
// under the same names everywhere: field*, menuItem*, round*.

/** A field dims to this opacity while disabled, as on the web (disabled:opacity-50). */
export const FIELD_DISABLED_OPACITY = 0.5;
/** Height of an option in a list, a comfortable touch target. */
export const OPTION_HEIGHT = scales.space.s7;

/**
 * Styles a label in the display face: semibold, uppercase, with the style's tracking. Buttons, chips and the
 * segmented choice use it.
 * @param theme Active theme.
 * @param step Font size step, e.g. "xs".
 * @returns Style for the label Text, in the text color.
 */
export function displayLabel(theme: ActiveTheme, step: keyof typeof scales.fontSize): TextStyle {
  const fontSize = scales.fontSize[step];
  return {
    fontFamily: fontFamily(theme.displayFont, 600),
    fontSize,
    letterSpacing: theme.displayTracking * fontSize,
    textTransform: 'uppercase',
    color: theme.colors.text,
  };
}

/**
 * Styles the parts of a text field and of a dropdown list: the field's spacing, the focus ring around the pill frame,
 * the frame by state, the typed text, the error under it, the list and an option with its text.
 * @param theme Active theme.
 * @returns The field's styles, each key starting with "field" or "option".
 */
export function fieldStyles(theme: ActiveTheme) {
  const { colors } = theme;
  return {
    field: { gap: scales.space.s1 } satisfies ViewStyle,
    fieldDisabled: { opacity: FIELD_DISABLED_OPACITY } satisfies ViewStyle,
    fieldError: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.sm, color: colors.danger } satisfies TextStyle,
    fieldFrame: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scales.space.s2,
      borderRadius: scales.radiusPill,
      borderWidth: scales.hairline,
      borderColor: colors.hairline,
      backgroundColor: colors.panel,
      paddingHorizontal: scales.space.s4,
      paddingVertical: scales.space.s2,
    } satisfies ViewStyle,
    fieldFrameError: { borderColor: colors.danger } satisfies ViewStyle,
    fieldFrameFocused: { borderColor: colors.accent } satisfies ViewStyle,
    fieldInput: {
      flex: 1,
      minWidth: 0,
      paddingVertical: scales.space.s1,
      fontFamily: fontFamily(scales.bodyFont),
      fontSize: scales.fontSize.base,
      color: colors.text,
    } satisfies TextStyle,
    fieldList: {
      marginTop: scales.space.s1,
      maxHeight: OPTION_HEIGHT * SELECT_VISIBLE_OPTIONS + scales.space.s1 * 2 + scales.hairline * 2,
      borderWidth: scales.hairline,
      borderColor: softHairline(theme),
      borderRadius: theme.radiusTile,
      backgroundColor: colors.panel,
    } satisfies ViewStyle,
    fieldListContent: { padding: scales.space.s1 } satisfies ViewStyle,
    fieldRing: { borderRadius: scales.radiusPill, borderWidth: scales.focusRing.width, borderColor: 'transparent' } satisfies ViewStyle,
    fieldRingError: { borderColor: withAlpha(colors.danger, scales.focusRing.opacity) } satisfies ViewStyle,
    fieldRingFocused: { borderColor: withAlpha(colors.accent, scales.focusRing.opacity) } satisfies ViewStyle,
    option: {
      height: OPTION_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      gap: scales.space.s2,
      paddingHorizontal: scales.space.s3,
      borderRadius: theme.radiusTile,
      backgroundColor: 'transparent',
    } satisfies ViewStyle,
    optionPressed: { backgroundColor: colors.panelRaised } satisfies ViewStyle,
    optionText: { flex: 1, fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.sm, color: colors.text } satisfies TextStyle,
    optionTextChosen: { color: colors.accent } satisfies TextStyle,
  };
}

/**
 * Styles the glow a style gives its accent: a soft accent shadow around the element, or nothing where the style has
 * no glow. A primary button, a switch's knob and a chosen segment use it.
 * @param theme Active theme.
 * @returns The shadow, or no style.
 */
export function glow(theme: ActiveTheme): ViewStyle {
  return theme.glow
    ? { shadowColor: theme.colors.accent, shadowOpacity: theme.glow.opacity, shadowRadius: theme.glow.blur / 2, shadowOffset: { width: 0, height: 0 } }
    : {};
}

/**
 * Styles a full-width menu item: the row, the raised fill while pressed, its label and its description. Switch,
 * Segmented and MenuItem use it inside a menu.
 * @param theme Active theme.
 * @returns The menu item's styles, each key starting with "menuItem".
 */
export function menuItemStyles(theme: ActiveTheme) {
  return {
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: scales.space.s3,
      paddingHorizontal: scales.space.s2,
      paddingVertical: scales.space.s2,
      borderRadius: theme.radiusTile,
      backgroundColor: 'transparent',
    } satisfies ViewStyle,
    menuItemDescription: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.xs, color: theme.colors.textMuted } satisfies TextStyle,
    menuItemLabel: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.sm, color: theme.colors.text } satisfies TextStyle,
    menuItemPressed: { backgroundColor: theme.colors.panelRaised } satisfies ViewStyle,
  };
}

/**
 * Styles a round button with a hairline frame on the panel, the accent frame while pressed: the × and the photo
 * viewer's arrows.
 * @param theme Active theme.
 * @param size Width and height, in px.
 * @returns The round button's styles, each key starting with "round".
 */
export function roundStyles(theme: ActiveTheme, size: number) {
  return {
    round: {
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: scales.hairline,
      borderColor: theme.colors.hairline,
      borderRadius: scales.radiusPill,
      backgroundColor: theme.colors.panel,
    } satisfies ViewStyle,
    roundPressed: { borderColor: theme.colors.accent } satisfies ViewStyle,
  };
}
