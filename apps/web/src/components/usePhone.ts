import { useSyncExternalStore } from 'react'
import { TABLE_CARD_BREAKPOINT } from '@apc/shared/table'

// Whether the window is as narrow as a phone, below `card:` (TABLE_CARD_BREAKPOINT), where a screen follows the phone
// layout (see "Phone layout" in AGENTS.md). Most of it is CSS (`max-card:`); this is for the parts a phone draws
// differently, such as the Dashboard's bottom bar in place of its header. It follows the window as it is resized.

const PHONE_QUERY = `(width < ${TABLE_CARD_BREAKPOINT}px)`

/**
 * Follows the phone query's changes.
 * @param changed Called when the window crosses the breakpoint.
 * @returns Stops following them.
 */
function subscribe(changed: () => void): () => void {
  const query = matchMedia(PHONE_QUERY)
  query.addEventListener('change', changed)
  return () => query.removeEventListener('change', changed)
}

/**
 * Tells whether the window is as narrow as a phone.
 * @returns True below `card:`.
 */
export function usePhone(): boolean {
  return useSyncExternalStore(subscribe, () => matchMedia(PHONE_QUERY).matches)
}
