import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { TOAST_DURATION_MS } from '@apc/shared/dialog'
import { ICON_SIZES } from '@apc/shared/icons'
import { TOAST_KIND_LOOKS, type ToastKind } from '@apc/shared/toast'
import { Icon } from './Icon.tsx'
import { toast } from './Toast.styles.ts'
import { ToastContext, type Toasts } from './toastContext.ts'

// Short messages at the bottom of the screen, each of a kind: success ("Item adicionado"), error ("Não foi possível
// …"), info or warning, in a pill of the kind's color with its icon. The polite live region is always in the page, so
// screen readers announce each success and info after what they are reading; an error or a warning comes in a new
// alert, read out at once. The toast hides on its own after TOAST_DURATION_MS, and a new one replaces the one showing.
// The region is a popover in the browser's top layer, raised again with each message, so a toast stays above an open
// modal dialog, such as one the item form shows while it is open.

type Shown = { id: number; kind: ToastKind; message: string }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<Shown | null>(null)
  const region = useRef<HTMLDivElement>(null)
  const { classes, ids } = toast()
  const show = useCallback((kind: ToastKind, message: string) => {
    // Raise the region above whatever opened in the top layer since, then show the message in it.
    region.current?.hidePopover()
    region.current?.showPopover()
    setShown((prev) => ({ id: (prev?.id ?? 0) + 1, kind, message }))
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
  const urgent = shown !== null && TOAST_KIND_LOOKS[shown.kind].urgent
  const pill = shown && <ToastMessage key={shown.id} kind={shown.kind} message={shown.message} />

  // The region stays open, empty between toasts, so screen readers keep its polite live region and announce each message.
  useEffect(() => {
    if (!region.current?.matches(':popover-open')) {
      region.current?.showPopover()
    }
  }, [])

  // Hide the toast after a while; a new message starts the wait again.
  useEffect(() => {
    if (!shown) {
      return
    }
    const timer = setTimeout(() => setShown(null), TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [shown])

  return (
    <ToastContext.Provider value={toasts}>
      {children}
      <div ref={region} popover="manual" className={classes.base()} data-testid={ids.base}>
        <div role="status" className={classes.polite()} data-testid={ids.polite}>
          {!urgent && pill}
        </div>
        {urgent && (
          <div role="alert" className={classes.urgent()} data-testid={ids.urgent}>
            {pill}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

/** A toast's pill: the kind's icon and the message, in the kind's colors. */
export function ToastMessage({ kind, message }: { kind: ToastKind; message: string }) {
  const { classes, ids } = toast({ kind })
  return (
    <span className={classes.message()} data-testid={ids.message} data-kind={kind}>
      <Icon icon={TOAST_KIND_LOOKS[kind].icon} size={ICON_SIZES.inline} className={classes.icon()} />
      {message}
    </span>
  )
}
