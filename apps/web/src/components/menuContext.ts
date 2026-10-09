import { createContext, useContext } from 'react'

/** Set inside an open Menu, so Switch and Segmented render as menu items and actions can close the menu. */
export const MenuContext = createContext<{ close: () => void } | null>(null)

/**
 * Reads the Menu around the caller, if any.
 * @returns The menu's close function, or null outside a menu.
 */
export function useMenu(): { close: () => void } | null {
  return useContext(MenuContext)
}
