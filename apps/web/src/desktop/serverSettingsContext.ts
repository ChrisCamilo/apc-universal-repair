import { createContext, useContext } from 'react'

/** Opens the desktop app's Servidor dialog (see ServerSettings.tsx); outside it, as in a browser, it does nothing. */
export const ServerSettingsContext = createContext<() => void>(() => {})

/**
 * Gets the way to open the Servidor dialog, as the user menu does.
 * @returns A function that opens it.
 */
export function useOpenServerSettings(): () => void {
  return useContext(ServerSettingsContext)
}
