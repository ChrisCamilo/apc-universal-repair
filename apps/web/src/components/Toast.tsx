import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ICON_SIZES } from '@apc/shared/icons'
import { readToastDuration, TOAST_DURATION_STORAGE_KEY, TOAST_FADE_MS, TOAST_KIND_LOOKS, type ToastKind } from '@apc/shared/toast'
import { readStored, writeStored } from '../storage.ts'
import { Icon } from './Icon.tsx'
import { toast } from './Toast.styles.ts'
import { ToastContext, ToastDurationContext, ToastFeedContext, type ToastDuration, type ToastListener, type Toasts } from './toastContext.ts'

// Short messages at the bottom of the screen, each of a kind: success ("Item adicionado"), error ("Não foi possível
// …"), info or warning, in a pill of the kind's color with its icon. The polite live region is always in the page, so
// screen readers announce each success and info after what they are reading; an error or a warning comes in a new
// alert, read out at once. The toast fades in rising a little, stays for the time the user picked (5 s unless they
// changed it in the bell's menu; saved on the device) and fades out; a new one
// takes the place of the one showing, which fades out under it, hidden from screen readers. With reduced motion they
// show and hide at once. Whoever listens through useToastFeed, such as the notifications history, hears each toast.
// The region is a popover in the browser's top layer, raised again with each message, so a toast stays above an open
// modal dialog, such as one the item form shows while it is open.

/** A toast on screen; a leaving one is fading out. */
type Shown = { id: number; kind: ToastKind; message: string; leaving: boolean }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<Shown[]>([])
  const region = useRef<HTMLDivElement>(null)
  const listeners = useRef(new Set<ToastListener>())
  const [durationMs, setDurationMs] = useState(() => readToastDuration(readStored(TOAST_DURATION_STORAGE_KEY)))
  const duration = useMemo<ToastDuration>(
    () => ({
      ms: durationMs,
      setMs: (ms) => {
        setDurationMs(ms)
        writeStored(TOAST_DURATION_STORAGE_KEY, String(ms))
      },
    }),
    [durationMs],
  )
  const { classes, ids } = toast()
  const subscribe = useCallback((listener: ToastListener) => {
    listeners.current.add(listener)
    return () => {
      listeners.current.delete(listener)
    }
  }, [])
  const show = useCallback((kind: ToastKind, message: string) => {
    // Raise the region above whatever opened in the top layer since, then show the message in it, over the one it
    // replaces, which leaves.
    region.current?.hidePopover()
    region.current?.showPopover()
    setShown((list) => [...list.map(leave), { id: (list.at(-1)?.id ?? 0) + 1, kind, message, leaving: false }])
    listeners.current.forEach((listener) => listener(kind, message))
  }, [])
  const toasts = useMemo<Toasts>(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
      info: (message) => show('info', message),
      warning: (message) => show('warning', message),
    }),
    [show],
  )
  // The id of the toast showing, if one is.
  const current = shown.find((toast) => !toast.leaving)?.id
  // The ids of the toasts fading out, so a new one leaving starts their wait again.
  const fading = shown
    .filter((toast) => toast.leaving)
    .map((toast) => toast.id)
    .join()
  const pills = (urgent: boolean) =>
    shown
      .filter((toast) => TOAST_KIND_LOOKS[toast.kind].urgent === urgent)
      .map((toast) => <ToastMessage key={toast.id} kind={toast.kind} message={toast.message} leaving={toast.leaving} />)

  // The region stays open, empty between toasts, so screen readers keep its polite live region and announce each message.
  useEffect(() => {
    if (!region.current?.matches(':popover-open')) {
      region.current?.showPopover()
    }
  }, [])

  // Let the toast leave after the time picked; a new message, or a new time, starts the wait again.
  useEffect(() => {
    if (current === undefined) {
      return
    }
    const timer = setTimeout(() => setShown((list) => list.map((toast) => (toast.id === current ? leave(toast) : toast))), durationMs)
    return () => clearTimeout(timer)
  }, [current, durationMs])

  // Take the toasts that left out once they faded.
  useEffect(() => {
    if (!fading) {
      return
    }
    const timer = setTimeout(() => setShown((list) => list.filter((toast) => !toast.leaving)), TOAST_FADE_MS)
    return () => clearTimeout(timer)
  }, [fading])

  return (
    <ToastContext.Provider value={toasts}>
      <ToastDurationContext.Provider value={duration}>
        <ToastFeedContext.Provider value={subscribe}>{children}</ToastFeedContext.Provider>
      </ToastDurationContext.Provider>
      <div ref={region} popover="manual" className={classes.base()} data-testid={ids.base}>
        <div role="status" className={classes.polite()} data-testid={ids.polite}>
          {pills(false)}
        </div>
        {shown.some((toast) => TOAST_KIND_LOOKS[toast.kind].urgent) && (
          <div role="alert" className={classes.urgent()} data-testid={ids.urgent}>
            {pills(true)}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

/** A toast's pill: the kind's icon and the message, in the kind's colors; fading out, and hidden from screen readers, while it leaves. */
export function ToastMessage({ kind, message, leaving = false }: { kind: ToastKind; message: string; leaving?: boolean }) {
  const { classes, ids } = toast({ kind, leaving })
  return (
    <span className={classes.message()} data-testid={ids.message} data-kind={kind} aria-hidden={leaving || undefined}>
      <Icon icon={TOAST_KIND_LOOKS[kind].icon} size={ICON_SIZES.inline} className={classes.icon()} />
      {message}
    </span>
  )
}

/**
 * Marks a toast as leaving, so it fades out.
 * @param shown The toast.
 * @returns The same toast, leaving.
 */
function leave(shown: Shown): Shown {
  return shown.leaving ? shown : { ...shown, leaving: true }
}
