import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { listItems } from '@apc/domain/item-filters';
import { itemListQuerySchema, type Item } from '@apc/domain/items';
import { EMPTY_ITEM_LISTS, type ItemLists } from '@apc/domain/lists';
import type { CatalogData } from '@apc/domain/catalog';
import { copyCatalog, copyItems, copyLists, type SyncCopy } from '@apc/domain/sync-copy';
import { conflictCards, type ConflictCard, type ConflictSide } from '@apc/domain/sync-conflicts';
import { withQueue, type QueuedOperation } from '@apc/domain/sync-queue';
import { askLocalNetwork, openAppSettings } from '../../app/localNetwork';
import { loadCopy, loadQueue, onCopyChanged, settle as settleQueued, syncCopy, type SyncResult } from './inventoryCopy';
import { useLocale } from '../../app/locale';

// The phone's copy of the inventory as the Dashboard holds it (see inventoryCopy.ts), with the changes waiting to be
// sent applied over it (see @apc/domain/sync-queue): one InventoryCopyProvider on the Dashboard, which the Inventory,
// the Catalog, the header and the user menu read (useInventoryCopy), so the copy keeps syncing whatever tab is open.
// It gives the copy's items, lists and catalog, as the API answers them, when it last caught up, how many changes
// wait, whether a sync is running, and whether the last one reached the server, or found the phone without the access
// to the local network, which allowNetwork asks for, or opens Android's settings for once it was refused for good (see
// localNetwork.ts); coming back from them to the foreground syncs again. The copy syncs when the Dashboard opens,
// when the app comes back to the foreground, when the Inventory's list is pulled down or the user menu asks, and
// again after each change the user sends, or each conflict with the computer the user settles, which it lists (see
// @apc/domain/sync-conflicts). A list query is answered from the copy the way GET /items answers it (listItems), its pages up
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
  /** Whether the last sync found the phone without the access to the local network, where the server is. */
  blocked: boolean;
  /** Whether a sync is running. */
  syncing: boolean;
  /** How many changes made on the phone wait to be sent, besides the ones in conflict. */
  waiting: number;
  /** The conflicts with what changed on the computer, waiting to be settled. */
  conflicts: ConflictCard[];
  /** Settles a conflict, keeping the computer's side or the phone's, then syncs. */
  settle: (card: ConflictCard, keep: ConflictSide) => Promise<void>;
  /** Brings the copy up to date with the server, saying how it went. */
  sync: () => Promise<SyncResult>;
  /** Asks for the access to the local network and syncs once given, or opens Android's settings when refused for good. */
  allowNetwork: () => Promise<void>;
};
/**
 * Where the list's pages stand: the copy still loading; loaded, with the items of the pages shown, how many match in
 * all and whether the next is on its way (never, as the copy holds them all); or failed, with no copy and no server.
 */
export type ItemPagesState = { status: 'loading' } | { status: 'ready'; items: Item[]; total: number; more: boolean } | { status: 'error' };

/** The copy the Dashboard holds, or null outside an InventoryCopyProvider. */
const InventoryCopyContext = createContext<InventoryCopy | null>(null);

/**
 * Holds the phone's copy for the screens under it: reads it, keeps it up to date with the server and follows its
 * changes.
 */
export function InventoryCopyProvider({ children }: { children: ReactNode }) {
  const copy = useCopyState();
  return <InventoryCopyContext.Provider value={copy}>{children}</InventoryCopyContext.Provider>;
}

/**
 * Reads the copy the Dashboard holds.
 * @returns The copy's items, lists and state, and sync to bring it up to date.
 */
export function useInventoryCopy(): InventoryCopy {
  const copy = useContext(InventoryCopyContext);
  if (!copy) {
    throw new Error('useInventoryCopy needs an InventoryCopyProvider.');
  }
  return copy;
}

/**
 * Reads the copy, keeps it up to date with the server and follows its changes.
 * @returns The copy's items, lists and state, and sync to bring it up to date.
 */
function useCopyState(): InventoryCopy {
  const { locale } = useLocale();
  const [copy, setCopy] = useState<SyncCopy>();
  const [waiting, setWaiting] = useState(0);
  // The queue as last read, whose conflicts are written as cards in the language chosen.
  const [queued, setQueued] = useState<QueuedOperation[]>([]);
  const conflicts = useMemo(() => conflictCards(queued, locale), [queued, locale]);
  const [offline, setOffline] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const live = useRef(true);
  // How many syncs were asked for and haven't ended, so syncing holds until the last one does.
  const running = useRef(0);

  const sync = useCallback(async () => {
    running.current += 1;
    setSyncing(true);
    const result = await syncCopy();
    running.current -= 1;
    if (live.current) {
      setOffline(result !== 'synced');
      setBlocked(result === 'blocked');
      setSyncing(running.current > 0);
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
          // An operation in conflict counts as a conflict, not as a change waiting.
          setWaiting(queue.filter((operation) => !operation.sent && !operation.conflicts).length);
          setQueued(queue);
        }
      }, () => {}); // A copy behind the phone's lock is read once AppLock opens it.
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
  const allowNetwork = useCallback(async () => {
    const access = await askLocalNetwork();
    if (access === 'blocked') {
      openAppSettings();
    } else if (access === 'granted') {
      sync();
    }
  }, [sync]);
  const settle = useCallback(
    async (card: ConflictCard, keep: ConflictSide) => {
      await settleQueued(card, keep);
      sync();
    },
    [sync],
  );
  const syncedAt = copy?.syncedAt;
  return useMemo(
    () => ({
      items,
      lists,
      catalog,
      syncedAt: syncedAt ? new Date(syncedAt) : null,
      offline,
      blocked,
      syncing,
      waiting,
      conflicts,
      settle,
      sync,
      allowNetwork,
    }),
    [items, lists, catalog, syncedAt, offline, blocked, syncing, waiting, conflicts, settle, sync, allowNetwork],
  );
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
