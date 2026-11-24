import { useMemo, useState } from 'react';
import { catalogFrom, type Catalog } from '@apc/domain/catalog';
import type { InventoryCopy } from '../inventory/useInventoryCopy';
import type { CatalogState } from './useCatalog';

// The Catalog tab's catalog, read from the phone's copy of the inventory (see useInventoryCopy.ts), so it shows with the
// server off: loading while the phone holds no copy yet, failed when it has none and the server can't be reached, and
// otherwise the copy's catalog. A change, made on the server, answers the whole catalog, which shows at once while the
// copy syncs to bring it in, and gives way to the copy's own once that sync is in.

/**
 * Reads the catalog from the copy, and takes the one a change answered until the copy brings it in.
 * @param copy The phone's copy, from useInventoryCopy.
 * @returns The catalog's state, reload to sync the copy again, and replace to take the catalog a change answered.
 */
export function useCopyCatalog(copy: InventoryCopy): CatalogState & { reload: () => void; replace: (catalog: Catalog) => void } {
  const [answered, setAnswered] = useState<Catalog>();
  const fromCopy = useMemo(() => copy.catalog && catalogFrom(copy.catalog), [copy.catalog]);
  const catalog = answered ?? fromCopy;
  const state: CatalogState = catalog ? { status: 'ready', catalog } : { status: copy.offline ? 'error' : 'loading' };
  return {
    ...state,
    reload: () => {
      copy.sync();
    },
    replace: (changed) => {
      setAnswered(changed);
      copy.sync().then((result) => {
        if (result === 'synced') {
          setAnswered((shown) => (shown === changed ? undefined : shown));
        }
      });
    },
  };
}
