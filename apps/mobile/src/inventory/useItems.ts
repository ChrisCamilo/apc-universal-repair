import { useEffect, useState } from 'react';
import { itemListResponseSchema, type Item } from '@apc/shared/items';
import { API_URL } from '../api';

// Loads every inventory item once from the API, the same as the web. The list screen searches and filters them
// in the app, so the counter can say how many items there are in all and how many are low or out of stock.

/** Where the items request stands: still loading, loaded with its items, or failed. */
export type ItemsState = { status: 'loading' } | { status: 'ready'; items: Item[] } | { status: 'error' };

/**
 * Fetches the items from GET /items and checks them against the shared schema.
 * @returns The request's state, with the items once loaded.
 */
export function useItems(): ItemsState {
  const [state, setState] = useState<ItemsState>({ status: 'loading' });

  useEffect(() => {
    const request = new AbortController();
    fetch(`${API_URL}/items`, { signal: request.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((body) => setState({ status: 'ready', items: itemListResponseSchema.parse(body).items }))
      .catch(() => {
        if (!request.signal.aborted) {
          setState({ status: 'error' });
        }
      });
    return () => request.abort();
  }, []);

  return state;
}
