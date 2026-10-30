import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@apc/shared/auth'
import { itemListResponseSchema, type Item } from '@apc/shared/items'

// Loads a list query's pages one after another, as a phone's list scrolls to its end: pages 1 to `pages`, joined in
// order, fetching only the ones not loaded yet. A new query starts over from its first page. A reload, e.g. after an
// item is saved, loads every page shown again, and the list keeps showing what it has until they come, so it stays
// where it was.

/**
 * Where the pages stand: the first still loading; loaded, with their items, how many match in all and whether the next
 * is on its way; or failed.
 */
export type ItemPagesState =
  | { status: 'loading' }
  | { status: 'ready'; items: Item[]; total: number; more: boolean }
  | { status: 'error' }

/** The pages loaded, for the query and the reload they were loaded for. */
type Loaded = { query: string; version: number; pages: Item[][]; total: number }

/**
 * Fetches the pages of a list query from GET /items and checks them against the shared schema.
 * @param query The first page's list query from itemListQuery, with its page size.
 * @param pages How many pages to show, from the first.
 * @param enabled Whether to fetch at all; off, the state stays loading.
 * @returns The pages' state, with their items once loaded, and reload to fetch them again.
 */
export function useItemPages(query: string, pages: number, enabled = true): ItemPagesState & { reload: () => void } {
  const [loaded, setLoaded] = useState<Loaded>()
  const [failed, setFailed] = useState(false)
  // Bumped to fetch the pages again.
  const [version, setVersion] = useState(0)
  // How many pages of which query and reload are in, for the effect to fetch only the missing ones.
  const held = useRef({ query: '', version: -1, count: 0 })

  useEffect(() => {
    if (!enabled) {
      return
    }
    const fresh = held.current.query !== query || held.current.version !== version
    const from = fresh ? 1 : held.current.count + 1
    if (from > pages) {
      return
    }
    const request = new AbortController()
    const page = (number: number) => {
      const params = new URLSearchParams(query)
      params.set('page', String(number))
      return apiFetch(`/api/items?${params}`, { signal: request.signal })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
        .then((body) => itemListResponseSchema.parse(body))
    }
    Promise.all(Array.from({ length: pages - from + 1 }, (_, index) => page(from + index)))
      .then((bodies) => {
        held.current = { query, version, count: pages }
        setFailed(false)
        setLoaded((current) => ({
          query,
          version,
          total: bodies[bodies.length - 1].total,
          pages: [...(fresh || !current ? [] : current.pages), ...bodies.map((body) => body.items)],
        }))
      })
      .catch(() => {
        if (!request.signal.aborted) {
          setFailed(true)
        }
      })
    return () => request.abort()
  }, [query, pages, enabled, version])

  const reload = () => {
    // After a failure, loading again shows as loading; a loaded list keeps showing while the new one comes.
    setFailed(false)
    setVersion((count) => count + 1)
  }
  if (failed) {
    return { status: 'error', reload }
  }
  if (!loaded) {
    return { status: 'loading', reload }
  }
  const shown = loaded.pages.slice(0, pages)
  const more = loaded.query === query && loaded.version === version && loaded.pages.length < pages
  return { status: 'ready', items: shown.flat(), total: loaded.total, more, reload }
}
