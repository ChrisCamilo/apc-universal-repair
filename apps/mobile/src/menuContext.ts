import { createContext, useContext } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import { scales } from '@apc/shared/theme';
import { fontFamily, type ActiveTheme } from './theme';

/** Layout of a full-width menu item: Switch and MenuItem rows (the corner radius comes from the theme). */
const MENU_ITEM_STYLE: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: scales.space.s3,
  paddingHorizontal: scales.space.s2,
  paddingVertical: scales.space.s2,
};
/** Set inside an open Menu, so Switch and Segmented render as menu items and actions can close the menu. */
export const MenuContext = createContext<{ close: () => void } | null>(null);

/**
 * Styles a full-width menu item: the shared layout, the theme's tile corners and the raised fill while pressed.
 * @param theme Active theme.
 * @param pressed Whether the item is being pressed (the mobile counterpart of hover).
 * @returns Style for the item Pressable.
 */
export function menuItemStyle(theme: ActiveTheme, pressed: boolean): ViewStyle {
  return {
    ...MENU_ITEM_STYLE,
    borderRadius: theme.radiusTile,
    backgroundColor: pressed ? theme.colors.panelRaised : 'transparent',
  };
}

/**
 * Styles the text of a menu item: the label in the text color, the description smaller and muted.
 * @param theme Active theme.
 * @param part Label or description.
 * @returns Style for a Text.
 */
export function menuItemText(theme: ActiveTheme, part: 'label' | 'description'): TextStyle {
  return part === 'label'
    ? { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.sm, color: theme.colors.text }
    : { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.xs, color: theme.colors.textMuted };
}

/**
 * Reads the Menu around the caller, if any.
 * @returns The menu's close function, or null outside a menu.
 */
export function useMenu(): { close: () => void } | null {
  return useContext(MenuContext);
}
