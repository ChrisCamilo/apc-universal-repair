import { useEffect, useState } from 'react';
import {
  createListEntry,
  EMPTY_ITEM_LISTS,
  loadItemLists,
  withEntry,
  type ItemListKind,
  type ItemLists,
  type ListEntry,
} from '@apc/shared/lists';
import { API_URL } from '../api';

// Loads the lists the item form picks from (categories, part brands, vehicle brands and vehicle models) and
// creates new names in them, adding each one created to its list at once, the same as the web. Lists that can't be
// loaded stay empty: the form then offers to create each name, and creating one the API already holds gives that
// one back.

/** Creates a name in a list, or finds it there; a vehicle model goes under its vehicle brand. */
export type CreateListEntry = (kind: ItemListKind, name: string, vehicleBrandId?: string) => Promise<ListEntry | null>;

/**
 * Fetches the four lists once and keeps the names created since.
 * @returns The lists, and create to add a name to one of them.
 */
export function useItemLists(): { lists: ItemLists; create: CreateListEntry } {
  const [lists, setLists] = useState<ItemLists>(EMPTY_ITEM_LISTS);

  useEffect(() => {
    const request = new AbortController();
    loadItemLists(API_URL, request.signal)
      .then(setLists)
      .catch(() => {});
    return () => request.abort();
  }, []);

  return {
    lists,
    create: async (kind, name, vehicleBrandId) => {
      const entry = await createListEntry(API_URL, kind, name, vehicleBrandId);
      if (entry) {
        setLists((held) => withEntry(held, kind, entry));
      }
      return entry;
    },
  };
}
