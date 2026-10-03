import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { TOAST_DURATION_MS } from '@apc/shared/dialog'
import { ToastContext } from './toastContext.ts'

// Short success messages ("Item adicionado", "Item excluído") at the bottom of the screen, in a pill with the
// colors turned around. The live region is always in the page, so screen readers announce each new message;
// the toast hides on its own after TOAST_DURATION_MS, and a new one replaces the one showing.

type Shown = { id: number; message: string }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<Shown | null>(null)
  const show = useCallback((message: string) => setShown((prev) => ({ id: (prev?.id ?? 0) + 1, message })), [])

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
        role="status"
        className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--spacing)*6+env(safe-area-inset-bottom))] z-50 flex justify-center"
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
