import { useEffect, useState } from 'react'
import { itemListResponseSchema, type Item } from '@apc/shared/items'

// Loads every inventory item from the API, and again on reload, e.g. after an item is saved. The list screen
// searches and filters them in the app, so the counter can say how many items there are in all and how many are
// low or out of stock.

/** Where the items request stands: still loading, loaded with its items, or failed. */
export type ItemsState = { status: 'loading' } | { status: 'ready'; items: Item[] } | { status: 'error' }

/**
 * Fetches the items from GET /items and checks them against the shared schema.
 * @returns The request's state, with the items once loaded, and reload to fetch them again.
 */
export function useItems(): ItemsState & { reload: () => void } {
  const [state, setState] = useState<ItemsState>({ status: 'loading' })
  // Bumped to fetch the items again; the list keeps showing while the new one comes.
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const request = new AbortController()
    fetch('/api/items', { signal: request.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((body) => setState({ status: 'ready', items: itemListResponseSchema.parse(body).items }))
      .catch(() => {
        if (!request.signal.aborted) {
          setState({ status: 'error' })
        }
      })
    return () => request.abort()
  }, [version])

  return { ...state, reload: () => setVersion((count) => count + 1) }
}
