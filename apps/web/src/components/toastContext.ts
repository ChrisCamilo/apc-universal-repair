import { createContext, useContext } from 'react'

/** Shows a toast; set by ToastProvider. Outside one it does nothing. */
export const ToastContext = createContext<(message: string) => void>(() => {})

/**
 * Gets the function that shows a toast, e.g. "Item adicionado" after a save.
 * @returns A function taking the message to show.
 */
export function useToast(): (message: string) => void {
  return useContext(ToastContext)
}
