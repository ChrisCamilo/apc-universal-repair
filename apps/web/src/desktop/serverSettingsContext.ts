import { createContext, useContext } from 'react'

/** What the Servidor dialog opens on: its start, or its port field. */
export type ServerSettingsFocus = 'port'
/**
 * Opens the desktop app's Servidor dialog (see ServerSettings.tsx), on its port field when asked; outside it, as in a
 * browser, it does nothing.
 */
export const ServerSettingsContext = createContext<(focus?: ServerSettingsFocus) => void>(() => {})

/**
 * Gets the way to open the Servidor dialog, as the user menu does.
 * @returns A function that opens it, on its port field when asked.
 */
export function useOpenServerSettings(): (focus?: ServerSettingsFocus) => void {
  return useContext(ServerSettingsContext)
}
