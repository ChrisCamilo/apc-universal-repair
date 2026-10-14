import { createContext, useContext } from 'react'
import type { ToastKind } from '@apc/shared/toast'

/** Shows a toast of each kind, each taking the message. */
export type Toasts = Record<ToastKind, (message: string) => void>

/** Shows toasts; set by ToastProvider. Outside one they do nothing. */
export const ToastContext = createContext<Toasts>({ success: () => {}, error: () => {}, info: () => {}, warning: () => {} })

/**
 * Gets the functions that show a toast of each kind, e.g. `success("Item adicionado")` after a save or
 * `error("Não foi possível …")` when it fails.
 * @returns A function per kind, each taking the message to show.
 */
export function useToast(): Toasts {
  return useContext(ToastContext)
}
