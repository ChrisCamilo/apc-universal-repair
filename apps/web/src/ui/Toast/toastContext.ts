import { createContext, useContext, useEffect, useEffectEvent } from 'react'
import { TOAST_DURATION, type ToastKind } from '@apc/shared/toast'

/** The time a toast stays on screen, in ms, and the way to change it, which also saves it on the device. */
export type ToastDuration = { ms: number; setMs: (ms: number) => void }
/** Hears a toast as it is shown. */
export type ToastListener = (kind: ToastKind, message: string) => void

/** Shows a toast of each kind, each taking the message. */
export type Toasts = Record<ToastKind, (message: string) => void>

/** Shows toasts; set by ToastProvider. Outside one they do nothing. */
export const ToastContext = createContext<Toasts>({ success: () => {}, error: () => {}, info: () => {}, warning: () => {} })

/** Adds a notification to the bell without showing a toast; set by ToastProvider. */
export const NotifyContext = createContext<ToastListener>(() => {})
/** The time a toast stays and the way to change it; set by ToastProvider. */
export const ToastDurationContext = createContext<ToastDuration>({ ms: TOAST_DURATION.defaultMs, setMs: () => {} })
/** Adds a listener to every toast shown and gives the way to remove it; set by ToastProvider. */
export const ToastFeedContext = createContext<(listener: ToastListener) => () => void>(() => () => {})

/**
 * Gets the function that adds a notification to the bell's history without showing it as a toast, e.g. a warning found
 * as the Inventory opens.
 * @returns A function taking the kind and the message.
 */
export function useNotify(): ToastListener {
  return useContext(NotifyContext)
}

/**
 * Gets the time a toast stays on screen and the way to change it, e.g. for the bell's settings.
 * @returns The time in ms and its setter.
 */
export function useToastDuration(): ToastDuration {
  return useContext(ToastDurationContext)
}

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
