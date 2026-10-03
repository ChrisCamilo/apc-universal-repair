import { createContext, useContext } from 'react'

/** Look of a full-width menu item: Switch and MenuItem rows. */
export const MENU_ITEM_CLASSES =
  'flex w-full cursor-pointer items-center justify-between gap-3 rounded-tile px-2 py-2 text-left font-body text-sm ' +
  'text-text outline-none transition-colors hover:bg-panel-raised focus-visible:bg-panel-raised'
/** Set inside an open Menu, so Switch and Segmented render as menu items and actions can close the menu. */
export const MenuContext = createContext<{ close: () => void } | null>(null)

/**
 * Reads the Menu around the caller, if any.
 * @returns The menu's close function, or null outside a menu.
 */
export function useMenu(): { close: () => void } | null {
  return useContext(MenuContext)
}
