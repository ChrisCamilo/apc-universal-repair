import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { listItems } from '@apc/domain/item-filters';
import { itemListQuerySchema, type Item } from '@apc/domain/items';
import { EMPTY_ITEM_LISTS, type ItemLists } from '@apc/domain/lists';
import type { CatalogData } from '@apc/domain/catalog';
import { copyCatalog, copyItems, copyLists, type SyncCopy } from '@apc/domain/sync-copy';
import { withQueue } from '@apc/domain/sync-queue';
import { loadCopy, loadQueue, onCopyChanged, syncCopy, type SyncResult } from './inventoryCopy';

// The Inventory's and the Catalog's view of the phone's copy of the inventory (see inventoryCopy.ts), with the changes
// waiting to be sent applied over it (see @apc/domain/sync-queue): its items, lists and catalog, as the API answers
// them, how many changes wait, and whether the last sync reached the server. The copy syncs when either tab
// opens, when the app comes back to the foreground and when the Inventory's list is pulled down, and again after each
// change the user sends. A list query is answered from the copy the way GET /items answers it (listItems), its pages up
// to the ones the list shows.

/** The phone's copy, as the Inventory reads it. */
export type InventoryCopy = {
  /** Every item of the copy, or null while the phone holds none yet. */
  items: Item[] | null;
  /** The lists the form and the filters pick from. */
  lists: ItemLists;
  /** The catalog, as GET /catalog answers it, or null while the phone holds no copy yet. */
  catalog: CatalogData | null;
  /** When the copy last caught up with the server, or null. */
  syncedAt: Date | null;
  /** Whether the last sync couldn't reach the server. */
  offline: boolean;
  /** Whether a sync is running. */
  syncing: boolean;
  /** How many changes made on the phone wait to be sent. */
  waiting: number;
  /** Brings the copy up to date with the server, saying how it went. */
  sync: () => Promise<SyncResult>;
};
/**
 * Where the list's pages stand: the copy still loading; loaded, with the items of the pages shown, how many match in
 * all and whether the next is on its way (never, as the copy holds them all); or failed, with no copy and no server.
 */
export type ItemPagesState = { status: 'loading' } | { status: 'ready'; items: Item[]; total: number; more: boolean } | { status: 'error' };

/**
 * Reads the copy, keeps it up to date with the server and follows its changes.
 * @returns The copy's items, lists and state, and sync to bring it up to date.
 */
export function useInventoryCopy(): InventoryCopy {
  const [copy, setCopy] = useState<SyncCopy>();
  const [waiting, setWaiting] = useState(0);
  const [offline, setOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const live = useRef(true);

  const sync = useCallback(async () => {
    setSyncing(true);
    const result = await syncCopy();
    if (live.current) {
      setOffline(result === 'offline');
      setSyncing(false);
    }
    return result;
  }, []);

  useEffect(() => {
    live.current = true;
    // A new object each time, as a sync changes the copy's rows in place.
    const read = () =>
      Promise.all([loadCopy(), loadQueue()]).then(([held, queue]) => {
        if (live.current) {
          setCopy(withQueue({ ...held }, queue));
          setWaiting(queue.filter((operation) => !operation.sent).length);
        }
      });
    const stop = onCopyChanged(read);
    read();
    sync();
    const foreground = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        sync();
      }
    });
    return () => {
      live.current = false;
      stop();
      foreground.remove();
    };
  }, [sync]);

  const items = useMemo(() => (copy?.syncedAt ? copyItems(copy) : null), [copy]);
  const lists = useMemo(() => (copy ? copyLists(copy) : EMPTY_ITEM_LISTS), [copy]);
  const catalog = useMemo(() => (copy?.syncedAt ? copyCatalog(copy) : null), [copy]);
  return { items, lists, catalog, syncedAt: copy?.syncedAt ? new Date(copy.syncedAt) : null, offline, syncing, waiting, sync };
}

/**
 * Answers the list's query from the copy, its pages up to the ones the list shows.
 * @param copy The copy.
 * @param query The first page's list query from itemListQuery, with its page size.
 * @param pages How many pages to show, from the first.
 * @returns The pages' state.
 */
export function useCopyPages(copy: InventoryCopy, query: string, pages: number): ItemPagesState {
  const { items, offline } = copy;
  return useMemo((): ItemPagesState => {
    if (!items) {
      return { status: offline ? 'error' : 'loading' };
    }
    const params = new URLSearchParams(query);
    const asked = itemListQuerySchema.parse(
      Object.fromEntries([...new Set(params.keys())].map((key) => [key, params.getAll(key).length > 1 ? params.getAll(key) : params.get(key)])),
    );
    const listed = listItems(items, { ...asked, page: 1, pageSize: asked.pageSize && asked.pageSize * pages });
    return { status: 'ready', items: listed.items, total: listed.total, more: false };
  }, [items, offline, query, pages]);
}
