import { createContext, useContext } from 'react'

/** True inside a Panel, so nested surfaces can adapt their corners and sheen. */
export const PanelContext = createContext(false)

/**
 * Tells whether the caller renders inside a Panel.
 * @returns True when a Panel wraps the caller at any depth.
 */
export function useInPanel(): boolean {
  return useContext(PanelContext)
}
