import { useEffect, useState, type RefObject } from 'react'

// Keeps an overlay on the page while it closes, so its closing transition plays: a dialog's content, a menu's popover,
// a field's list. While it leaves the overlay is `inert`, so it takes no focus or clicks and screen readers skip it,
// and it goes once the transitions its closing started have ended. With reduced motion it goes at once.

/**
 * Tells whether an overlay is on the page, and whether it is leaving.
 * @param open Whether the overlay is open.
 * @param element The overlay's element, whose transitions (and its pseudo-elements' and children's) it waits for.
 * @returns `present` while it is open or leaving, and `leaving` from its closing until its transitions end.
 */
export function usePresence(open: boolean, element: RefObject<Element | null>): { present: boolean; leaving: boolean } {
  const [shown, setShown] = useState(open)
  const [leaving, setLeaving] = useState(false)
  // Closing starts the leaving in the same render, so the overlay never blinks out; opening again ends it.
  if (shown !== open) {
    setShown(open)
    setLeaving(!open && !matchMedia('(prefers-reduced-motion: reduce)').matches)
  }

  // Let the overlay go once its closing transitions end, read a frame later, when a dialog has closed too.
  useEffect(() => {
    if (!leaving) {
      return
    }
    let live = true
    const frame = requestAnimationFrame(() => {
      const transitions = (element.current?.getAnimations({ subtree: true }) ?? []).filter((animation) => animation instanceof CSSTransition)
      void Promise.allSettled(transitions.map((transition) => transition.finished)).then(() => live && setLeaving(false))
    })
    return () => {
      live = false
      cancelAnimationFrame(frame)
    }
  }, [leaving, element])

  return { present: open || leaving, leaving: leaving && !open }
}
