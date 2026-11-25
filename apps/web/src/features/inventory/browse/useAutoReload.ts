import { useEffect, useRef } from 'react'

// Loads the Inventory again by itself, so a change another device made shows without a search or a reload: when the
// window (the browser's or the desktop app's) comes back to the foreground, and every AUTO_RELOAD_MS while it is on
// screen. It waits while something over the list is open (a form, a dialog, a sheet, the tutorial), where a list
// changing underneath would get in the way, and starts again once it closes. A focus and a visibility change that come
// together load once.

/** How often the Inventory loads again while it is on screen, in ms. */
export const AUTO_RELOAD_MS = 30_000
/** How close two triggers are taken as one, as a window coming back fires focus and visibilitychange, in ms. */
const SAME_TRIGGER_MS = 1_000

/**
 * Calls reload when the window comes back to the foreground and every AUTO_RELOAD_MS while it is on screen.
 * @param reload Loads the list again, keeping what it shows.
 * @param paused Whether something over the list is open, which holds the reloads.
 */
export function useAutoReload(reload: () => void, paused: boolean): void {
  const latest = useRef(reload)
  // When it last loaded, so a focus and a visibility change together load once.
  const last = useRef(0)

  useEffect(() => {
    latest.current = reload
  })

  useEffect(() => {
    if (paused) {
      return
    }
    const run = () => {
      const now = Date.now()
      if (document.visibilityState !== 'visible' || now - last.current < SAME_TRIGGER_MS) {
        return
      }
      last.current = now
      latest.current()
    }
    const timer = window.setInterval(run, AUTO_RELOAD_MS)
    window.addEventListener('focus', run)
    document.addEventListener('visibilitychange', run)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', run)
      document.removeEventListener('visibilitychange', run)
    }
  }, [paused])
}
