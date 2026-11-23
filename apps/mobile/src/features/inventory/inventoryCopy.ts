import { NativeModules } from 'react-native';
import { apiFetch } from '@apc/domain/auth';
import { SYNC_CHANGES_PATH, syncChangesSchema, type SyncChanges } from '@apc/domain/sync';
import { applyChanges, emptyCopy, type SyncCopy } from '@apc/domain/sync-copy';
import { apiUrl } from '../../app/api';
import { clearPhotos, keepThumbnails } from './photoCache';

// The phone's copy of the paired server's inventory (see @apc/domain/sync-copy), which the Inventory reads, so it works
// away from the server. It is kept on disk by the native side (InventoryCopyModule.kt), encrypted with a key held in the
// Android Keystore, and read once into memory. Syncing asks the server's change feed (GET /sync/changes) for every page
// after the copy's cursor, or for a full copy when it has none, or when the server answers 410 (its database moved, or
// the copy waited longer than the deletions it keeps); the pages are applied all at once, once the last one is in, and
// written to disk, so the copy never shows a sync caught halfway. A sync that can't reach the server leaves the copy as
// it was and says so. One sync runs at a time: asking again while one runs gets that one. Logging out and pairing with
// another server clear the copy, on disk and its key; a sync still running then keeps nothing of what it brought. The
// photos' thumbnails are kept after each sync, and cleared with the copy (see photoCache.ts).

/** The native side that keeps the copy encrypted on disk (InventoryCopyModule.kt). */
const native = NativeModules.InventoryCopy as {
  read: () => Promise<string | null>;
  write: (copy: string) => Promise<void>;
  clear: () => Promise<void>;
};

/** How a sync ended: the copy caught up with the server, or the server couldn't be reached and the copy stayed. */
export type SyncResult = 'synced' | 'offline';

/** The copy in memory, once read. */
let held: SyncCopy | null = null;
/** The sync running, if any. */
let running: Promise<SyncResult> | null = null;
/** Bumped by each clear, so a sync started before it keeps nothing. */
let generation = 0;
/** What to call when the copy changes. */
const listeners = new Set<() => void>();

/**
 * Reads the copy, from disk the first time.
 * @returns The copy, empty when the phone has none yet.
 */
export async function loadCopy(): Promise<SyncCopy> {
  if (!held) {
    const saved = await native.read().catch(() => null);
    held ??= saved ? (JSON.parse(saved) as SyncCopy) : emptyCopy();
  }
  return held;
}

/**
 * Brings the copy up to date with the server, unless a sync is already running.
 * @returns How the sync ended.
 */
export function syncCopy(): Promise<SyncResult> {
  if (!running) {
    const started: Promise<SyncResult> = sync().finally(() => {
      if (running === started) {
        running = null;
      }
    });
    running = started;
  }
  return running;
}

/**
 * Asks the server for every page of changes after the copy's cursor, starting over from a full copy when it answers 410,
 * then applies them, writes the copy to disk and tells the listeners.
 * @returns How the sync ended.
 */
async function sync(): Promise<SyncResult> {
  const started = generation;
  const copy = await loadCopy();
  let cursor = copy.cursor;
  let fresh = cursor === null;
  const pages: SyncChanges[] = [];
  try {
    for (;;) {
      const response = await apiFetch(`${apiUrl()}${SYNC_CHANGES_PATH}${cursor ? `?${new URLSearchParams({ since: cursor })}` : ''}`);
      if (response.status === 410 && !fresh) {
        cursor = null;
        fresh = true;
        pages.length = 0;
        continue;
      }
      if (!response.ok) {
        return 'offline';
      }
      const page = syncChangesSchema.parse(await response.json());
      pages.push(page);
      cursor = page.cursor;
      if (!page.more) {
        break;
      }
    }
  } catch {
    return 'offline';
  }
  if (generation !== started) {
    return 'offline';
  }
  const next = pages.reduce(applyChanges, fresh ? emptyCopy() : copy);
  next.syncedAt = new Date().toISOString();
  held = next;
  await native.write(JSON.stringify(next)).catch(() => {});
  listeners.forEach((listener) => listener());
  // The photos' thumbnails follow in the background, and the ones of photos gone are dropped (see photoCache.ts).
  keepThumbnails(Object.values(next.rows.itemPhoto)).catch(() => {});
  return 'synced';
}

/**
 * Deletes the copy, on disk and in memory, and the photos kept with it, as logging out or pairing with another server
 * does.
 */
export async function clearCopy(): Promise<void> {
  generation += 1;
  // A sync still running keeps nothing; the next one starts over.
  running = null;
  held = emptyCopy();
  await Promise.all([native.clear().catch(() => {}), clearPhotos()]);
  listeners.forEach((listener) => listener());
}

/**
 * Calls a function each time the copy changes.
 * @param listener The function.
 * @returns What stops the calls.
 */
export function onCopyChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
