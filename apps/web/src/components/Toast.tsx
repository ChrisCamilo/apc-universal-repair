import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { TOAST_DURATION_MS } from '@apc/shared/dialog'
import { ToastContext } from './toastContext.ts'

// Short success messages ("Item adicionado", "Item excluído") at the bottom of the screen, in a pill with the
// colors turned around. The live region is always in the page, so screen readers announce each new message;
// the toast hides on its own after TOAST_DURATION_MS, and a new one replaces the one showing. The region is a
// popover in the browser's top layer, raised again with each message, so a toast stays above an open modal dialog,
// such as one the item form shows while it is open.

type Shown = { id: number; message: string }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<Shown | null>(null)
  const region = useRef<HTMLDivElement>(null)
  const show = useCallback((message: string) => {
    // Raise the region above whatever opened in the top layer since, then show the message in it.
    region.current?.hidePopover()
    region.current?.showPopover()
    setShown((prev) => ({ id: (prev?.id ?? 0) + 1, message }))
  }, [])

  // The region stays open, empty between toasts, so screen readers keep it and announce each message.
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
    <ToastContext.Provider value={show}>
      {children}
      <div
        ref={region}
        role="status"
        popover="manual"
        className="pointer-events-none fixed inset-x-4 top-auto bottom-[calc(var(--spacing)*6+env(safe-area-inset-bottom))] m-0 flex h-auto w-auto justify-center overflow-visible border-0 bg-transparent p-0"
      >
        {shown && (
          <span
            key={shown.id}
            className="rounded-pill bg-text px-4 py-2 text-center font-display text-xs font-semibold uppercase tracking-display text-canvas shadow-pop"
          >
            {shown.message}
          </span>
        )}
      </div>
    </ToastContext.Provider>
  )
}
