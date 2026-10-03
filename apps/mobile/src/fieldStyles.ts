import type { TextStyle, ViewStyle } from 'react-native';
import { SELECT_VISIBLE_OPTIONS } from '@apc/shared/filters';
import { scales } from '@apc/shared/theme';
import { softHairline } from './Panel';
import { fontFamily, withAlpha, type ActiveTheme } from './theme';

// Styles shared by the text inputs (TextField, SearchField, Combobox) and the dropdown lists (Select, Combobox),
// so fields and lists look the same everywhere, as on the web.

const DISABLED_OPACITY = 0.5;
/** Height of an option in a list, a comfortable touch target. */
export const OPTION_HEIGHT = scales.space.s7;

/**
 * Spaces the label, frame and note of a field, and dims it while disabled.
 * @param disabled Whether the field is disabled.
 * @returns Style for the field's outer view.
 */
export function fieldStyle(disabled: boolean): ViewStyle {
  return { gap: scales.space.s1, opacity: disabled ? DISABLED_OPACITY : 1 };
}

/**
 * Builds the pill frame and the focus-ring frame around it.
 * @param theme Active theme.
 * @param focused Whether the input has focus.
 * @param error Whether the field shows an error.
 * @returns Styles for the outer ring and the inner frame.
 */
export function frameStyles(theme: ActiveTheme, focused: boolean, error: boolean): { ring: ViewStyle; frame: ViewStyle } {
  const { colors } = theme;
  return {
    ring: {
      borderRadius: scales.radiusPill,
      borderWidth: scales.focusRing.width,
      borderColor: focused ? withAlpha(error ? colors.danger : colors.accent, scales.focusRing.opacity) : 'transparent',
    },
    frame: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scales.space.s2,
      borderRadius: scales.radiusPill,
      borderWidth: scales.hairline,
      borderColor: error ? colors.danger : focused ? colors.accent : colors.hairline,
      backgroundColor: colors.panel,
      paddingHorizontal: scales.space.s4,
      paddingVertical: scales.space.s2,
    },
  };
}

/**
 * Styles the typed text: body face in the text color, filling the frame.
 * @param theme Active theme.
 * @returns Style for the TextInput.
 */
export function inputStyle(theme: ActiveTheme): TextStyle {
  return {
    flex: 1,
    minWidth: 0,
    paddingVertical: scales.space.s1,
    fontFamily: fontFamily(scales.bodyFont),
    fontSize: scales.fontSize.base,
    color: theme.colors.text,
  };
}

/**
 * Styles the list under the button: soft frame, room for SELECT_VISIBLE_OPTIONS options, scrolling past that.
 * @param theme Active theme.
 * @returns Style for the list ScrollView.
 */
export function listStyle(theme: ActiveTheme): ViewStyle {
  return {
    marginTop: scales.space.s1,
    maxHeight: OPTION_HEIGHT * SELECT_VISIBLE_OPTIONS + scales.space.s1 * 2 + scales.hairline * 2,
    borderWidth: scales.hairline,
    borderColor: softHairline(theme),
    borderRadius: theme.radiusTile,
    backgroundColor: theme.colors.panel,
  };
}

/**
 * Styles the text of the button and the options: body face, text color or accent when chosen.
 * @param theme Active theme.
 * @param chosen Whether the option is chosen.
 * @returns Style for a Text.
 */
export function optionTextStyle(theme: ActiveTheme, chosen: boolean): TextStyle {
  return {
    flex: 1,
    fontFamily: fontFamily(scales.bodyFont),
    fontSize: scales.fontSize.sm,
    color: chosen ? theme.colors.accent : theme.colors.text,
  };
}
