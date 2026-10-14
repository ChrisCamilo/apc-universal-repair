import { createContext, useContext, useEffect, useEffectEvent } from 'react'
import type { ToastKind } from '@apc/shared/toast'

/** Hears a toast as it is shown. */
export type ToastListener = (kind: ToastKind, message: string) => void

/** Shows a toast of each kind, each taking the message. */
export type Toasts = Record<ToastKind, (message: string) => void>

/** Shows toasts; set by ToastProvider. Outside one they do nothing. */
export const ToastContext = createContext<Toasts>({ success: () => {}, error: () => {}, info: () => {}, warning: () => {} })

/** Adds a listener to every toast shown and gives the way to remove it; set by ToastProvider. */
export const ToastFeedContext = createContext<(listener: ToastListener) => () => void>(() => () => {})

/**
 * Hears every toast shown while the caller is mounted, e.g. to keep them in the notifications history.
 * @param listener Called with each toast's kind and message.
 */
export function useToastFeed(listener: ToastListener): void {
  const subscribe = useContext(ToastFeedContext)
  const hear = useEffectEvent(listener)
  useEffect(() => subscribe((kind, message) => hear(kind, message)), [subscribe])
}

/**
 * Gets the functions that show a toast of each kind, e.g. `success("Item adicionado")` after a save or
 * `error("Não foi possível …")` when it fails.
 * @returns A function per kind, each taking the message to show.
 */
export function useToast(): Toasts {
  return useContext(ToastContext)
}
