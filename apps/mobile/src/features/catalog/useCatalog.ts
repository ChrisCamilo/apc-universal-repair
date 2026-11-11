import { useEffect, useState } from 'react';
import { loadCatalog, type Catalog } from '@apc/domain/catalog';
import { apiUrl } from '../../app/api';

// Loads the vehicle catalog from the API for the Catalog tab, and again on reload, after a failure, the same as the web;
// a change made to it hands over the catalog the API answered, which replaces the one loaded.

/** Where the catalog request stands: still loading, loaded with the catalog, or failed. */
export type CatalogState = { status: 'loading' } | { status: 'ready'; catalog: Catalog } | { status: 'error' };

/**
 * Fetches the catalog from GET /catalog and checks it against the shared schema.
 * @returns The request's state, with the catalog once loaded, reload to fetch it again, and replace to take the one a
 *   change answered.
 */
export function useCatalog(): CatalogState & { reload: () => void; replace: (catalog: Catalog) => void } {
  const [state, setState] = useState<CatalogState>({ status: 'loading' });
  // Bumped to fetch the catalog again.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const request = new AbortController();
    loadCatalog(apiUrl(), request.signal)
      .then((catalog) => setState({ status: 'ready', catalog }))
      .catch(() => {
        if (!request.signal.aborted) {
          setState({ status: 'error' });
        }
      });
    return () => request.abort();
  }, [version]);

  return {
    ...state,
    reload: () => {
      setState({ status: 'loading' });
      setVersion((count) => count + 1);
    },
    replace: (catalog) => setState({ status: 'ready', catalog }),
  };
}
