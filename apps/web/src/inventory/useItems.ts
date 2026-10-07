import { useEffect, useState } from 'react'
import { itemListResponseSchema, type Item } from '@apc/shared/items'

// Loads the inventory items from the API, every item or those a list query lets through, and again on reload, e.g.
// after an item is saved. The list screen loads every item too, so the counter can say how many there are in all
// and how many are low or out of stock, and the filters and the form can offer what is in stock.

/** Where the items request stands: still loading, loaded with its items, or failed. */
export type ItemsState = { status: 'loading' } | { status: 'ready'; items: Item[] } | { status: 'error' }

/**
 * Fetches the items from GET /items and checks them against the shared schema.
 * @param query List query from itemListQuery; every item when empty.
 * @param enabled Whether to fetch at all; off, the state stays loading.
 * @returns The request's state, with the items once loaded, and reload to fetch them again.
 */
export function useItems(query = '', enabled = true): ItemsState & { reload: () => void } {
  const [state, setState] = useState<ItemsState>({ status: 'loading' })
  // Bumped to fetch the items again; the list keeps showing while the new one comes.
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!enabled) {
      return
    }
    const request = new AbortController()
    fetch(query ? `/api/items?${query}` : '/api/items', { signal: request.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((body) => setState({ status: 'ready', items: itemListResponseSchema.parse(body).items }))
      .catch(() => {
        if (!request.signal.aborted) {
          setState({ status: 'error' })
        }
      })
    return () => request.abort()
  }, [query, enabled, version])

  return { ...state, reload: () => setVersion((count) => count + 1) }
}
