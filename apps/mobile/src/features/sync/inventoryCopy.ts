import { NativeModules } from 'react-native';
import { apiFetch } from '@apc/domain/auth';
import { optionKey } from '@apc/domain/items';
import { ITEM_LIST_PATHS, listEntrySchema } from '@apc/domain/lists';
import { PHOTO_PARTS } from '@apc/domain/photos';
import {
  SYNC_CHANGES_PATH,
  SYNC_OPERATIONS_MAX,
  SYNC_OPERATIONS_PATH,
  syncChangesSchema,
  syncOperationsResultSchema,
  type SyncChanges,
  type SyncConflict,
} from '@apc/domain/sync';
import { settleConflict, type ConflictCard, type ConflictSide } from '@apc/domain/sync-conflicts';
import { applyChanges, copyItems, emptyCopy, type SyncCopy } from '@apc/domain/sync-copy';
import {
  conflictNotice,
  isItemOperation,
  refusedNotice,
  sentOperation,
  type NameOperation,
  type PhotosOperation,
  type QueuedItemOperation,
  type QueuedOperation,
  withQueue,
} from '@apc/domain/sync-queue';
import type { Locale } from '@apc/domain/locale';
import { apiUrl } from '../../app/api';
import { loadLocale } from '../../app/locale';
import { hasLocalNetwork } from '../../app/localNetwork';
import { clearPhotos, keepThumbnails, releasePhotos } from './photoCache';
import { refusalReason } from '@apc/domain/refusals';

// The phone's copy of the paired server's inventory (see @apc/domain/sync-copy), which the Inventory reads, so it works
// away from the server, and the queue of the changes made on the phone, waiting to be sent (see
// @apc/domain/sync-queue). Both are kept on disk by the native side (InventoryCopyModule.kt), in one file encrypted with
// a key held in the Android Keystore, and read once into memory. Syncing first sends the queue, in order: the item
// operations in batches to POST /sync/operations, a brand's photos to the photo route and a new name to its list's
// route. An operation the server accepted is marked sent, and one it refused leaves the queue, with the operations of a
// new item it refused, and the listeners hear why; one in conflict with what changed on the computer stays, unsent,
// with its conflicts and the item as the phone showed it, until the user settles each (settle, see
// @apc/domain/sync-conflicts), and the listeners hear of it. Then syncing asks the server's change feed
// (GET /sync/changes) for every page after the copy's cursor, or for a full copy when it has none, or when the server answers 410 (its database
// moved, or the copy waited longer than the deletions it keeps); the pages are applied all at once, once the last one is
// in, and written to disk, so the copy never shows a sync caught halfway, and the operations sent leave the queue, as
// the copy now holds them. A sync that can't reach the server leaves the copy and what is still waiting as they were,
// and says so; one on a phone without the access to the local network, where the server is (see localNetwork.ts),
// doesn't try, and says that instead. One sync runs at a time: asking again while one runs gets another after it, as a change made meanwhile
// may have missed the one running. Logging out and an expired session clear the copy and keep the queue, which goes out
// once logged in again; pairing with another server clears both, on disk with their key. A sync still running then
// keeps nothing of what it brought. On a phone with a screen lock, the file opens only once the lock is confirmed
// (unlockCopy, see AppLock.tsx); while it isn't, reading and writing it are refused, and nothing is taken for no copy.
// The photos' thumbnails are kept after each sync, and cleared with the copy; a photo picked for the queue is held until
// its change leaves it (see photoCache.ts).

/** The native side that keeps the copy encrypted on disk (InventoryCopyModule.kt), behind the phone's lock. */
const native = NativeModules.InventoryCopy as {
  read: () => Promise<string | null>;
  write: (copy: string) => Promise<void>;
  clear: () => Promise<void>;
  unlock: (title: string, subtitle: string) => Promise<UnlockResult>;
  lock: () => Promise<void>;
  hasLock: () => Promise<boolean>;
  openLockSettings: () => void;
};

/**
 * How a sync ended: the copy caught up with the server, or the server couldn't be reached and the copy stayed, or the
 * phone hasn't the access to the local network to reach it.
 */
export type SyncResult = 'synced' | 'offline' | 'blocked';
/** How unlocking the copy ended: it can be read, or the phone's lock wasn't confirmed. */
export type UnlockResult = 'open' | 'cancelled';
/** What the server answered an operation sent: accepted, refused with why, or in conflict with what changed there. */
type Answer = { refused?: string; conflicts?: SyncConflict[] };
/** What the server answered each operation sent. */
type Answers = Map<string, Answer>;

/** The copy in memory, once read. */
let held: SyncCopy | null = null;
/** The changes waiting, in order, once read. */
let queue: QueuedOperation[] = [];
/** The sync running, if any. */
let running: Promise<SyncResult> | null = null;
/** The sync asked for while one runs, to start once it ends, if any. */
let following: Promise<SyncResult> | null = null;
/** Bumped by each clear, so a sync started before it keeps nothing. */
let generation = 0;
/** What to call when the copy or the queue changes. */
const listeners = new Set<() => void>();
/** What to call with why the server refused operations. */
const refusalListeners = new Set<(notices: string[]) => void>();

/**
 * Reads the copy, and the queue kept with it, from disk the first time.
 * @returns The copy, empty when the phone has none yet.
 */
export async function loadCopy(): Promise<SyncCopy> {
  if (!held) {
    // A copy behind the phone's lock isn't read as none, which the next write would put in its place.
    const saved = await native.read().catch((error: { code?: string }) => {
      if (error?.code === 'locked') {
        throw error;
      }
      return null;
    });
    if (!held) {
      const { queue: kept, ...copy } = saved ? (JSON.parse(saved) as SyncCopy & { queue?: QueuedOperation[] }) : { ...emptyCopy(), queue: [] };
      held = copy;
      queue = kept ?? [];
    }
  }
  return held;
}

/**
 * Reads the changes waiting to be sent, and the ones sent that the copy doesn't hold yet.
 * @returns The queue, in order.
 */
export async function loadQueue(): Promise<QueuedOperation[]> {
  await loadCopy();
  return queue;
}

/** Writes the copy and the queue to disk. */
async function save() {
  await native.write(JSON.stringify({ ...held, queue })).catch(() => {});
}

/** Tells the listeners the copy or the queue changed. */
function changed() {
  listeners.forEach((listener) => listener());
}

/**
 * Adds changes to the queue, after the ones waiting, and keeps it on disk; the next sync sends them.
 * @param operations The changes, in order.
 */
export async function enqueue(operations: readonly QueuedOperation[]): Promise<void> {
  await loadCopy();
  queue = [...queue, ...operations];
  await save();
  changed();
}

/**
 * Brings the copy up to date with the server, as it is now: a sync starts, or, while one runs, another follows it, as a
 * change made meanwhile may have missed the one running; asking again before that one starts gets it too.
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
    return started;
  }
  if (!following) {
    const after = running;
    const next: Promise<SyncResult> = after.then(() => {
      if (following === next) {
        following = null;
      }
      return syncCopy();
    });
    following = next;
  }
  return following;
}

/**
 * Sends the queue, then asks the server for every page of changes after the copy's cursor, starting over from a full
 * copy when it answers 410, then applies them, drops the operations sent, writes the copy to disk and tells the
 * listeners.
 * @returns How the sync ended.
 */
async function sync(): Promise<SyncResult> {
  const started = generation;
  const copy = await loadCopy();
  if (!(await hasLocalNetwork())) {
    return 'blocked';
  }
  // An answer that isn't one, as one that never came, leaves what waits for the next sync.
  if (!(await send(started).catch(() => false))) {
    return 'offline';
  }
  let cursor = copy.cursor;
  let fresh = cursor === null;
  const pages: SyncChanges[] = [];
  try {
    for (;;) {
      const response = await apiFetch(`${apiUrl()}${SYNC_CHANGES_PATH}${cursor ? `?${new URLSearchParams({ since: cursor })}` : ''}`);
      if (!response.ok && !fresh && (await refusalReason(response)) === 'cursorGone') {
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
  // The copy now holds what the server accepted.
  queue = queue.filter((operation) => !operation.sent);
  await save();
  changed();
  releasePhotos(heldPhotos(queue));
  // The photos' thumbnails follow in the background, and the ones of photos gone are dropped (see photoCache.ts).
  keepThumbnails(Object.values(next.rows.itemPhoto)).catch(() => {});
  return 'synced';
}

/**
 * Sends the operations waiting, in order, until none is left: each run of item operations in a batch, and a brand's
 * photos and a name one at a time. Each answer is kept as it comes: an operation accepted is marked sent, and one
 * refused leaves the queue, the listeners hearing why.
 * @param started The clear the sync started after, so a clear meanwhile stops it.
 * @returns Whether every operation got its answer; false when the server couldn't be reached.
 */
async function send(started: number): Promise<boolean> {
  // The notices are written in the language chosen on the phone when the sync runs.
  const locale = await loadLocale();
  for (;;) {
    // An operation in conflict waits until it is settled.
    const waiting = queue.filter((operation) => !operation.sent && !operation.conflicts);
    if (waiting.length === 0) {
      return true;
    }
    const [first] = waiting;
    const firstOther = waiting.findIndex((operation) => !isItemOperation(operation));
    const answers = isItemOperation(first)
      ? await sendItems(waiting.slice(0, firstOther < 0 ? SYNC_OPERATIONS_MAX : Math.min(firstOther, SYNC_OPERATIONS_MAX)) as QueuedItemOperation[], locale)
      : first.type === 'savePhotos'
        ? await sendPhotos(first, locale)
        : await sendName(first as NameOperation & QueuedOperation, locale);
    if (!answers || generation !== started) {
      return false;
    }
    take(answers, locale);
    await save();
    changed();
  }
}

/**
 * Takes the server's answers into the queue: an operation accepted marked sent, one refused dropped, with what waits
 * on a new item refused, and the listeners told why; one in conflict kept with its conflicts and the item as the phone
 * shows it now, to settle (see @apc/domain/sync-conflicts), and the listeners told so.
 * @param answers Each operation's answer.
 * @param locale The language of the notices.
 */
function take(answers: Answers, locale: Locale) {
  const notices: string[] = [];
  const refusedItems = new Set<string>();
  const conflicted = [...answers.values()].some((answer) => answer.conflicts);
  const shown = conflicted && held ? copyItems(withQueue(held, queue)) : [];
  queue = queue.flatMap((operation): QueuedOperation[] => {
    const answer = answers.get(operation.id);
    if ('itemId' in operation && refusedItems.has(operation.itemId) && !operation.sent) {
      return [];
    }
    if (!answer) {
      return [operation];
    }
    if (answer.conflicts) {
      notices.push(conflictNotice(operation, locale));
      const snapshot = 'itemId' in operation ? shown.find((item) => item.id === operation.itemId) : undefined;
      return [{ ...operation, conflicts: answer.conflicts, ...(snapshot && { snapshot }) }];
    }
    if (answer.refused === undefined) {
      return [{ ...operation, sent: true }];
    }
    notices.push(answer.refused);
    if (operation.type === 'createItem') {
      refusedItems.add(operation.itemId);
    }
    return [];
  });
  if (notices.length > 0) {
    refusalListeners.forEach((listener) => listener(notices));
    releasePhotos(heldPhotos(queue));
  }
}

/**
 * Tells whether a response refuses what was sent, as opposed to the server not taking it now: a 4xx other than 401,
 * which ends the session.
 * @param status The response's status.
 * @returns True when refused.
 */
function refuses(status: number): boolean {
  return status >= 400 && status < 500 && status !== 401;
}

/**
 * Sends a batch of item operations.
 * @param operations The operations, in order.
 * @param locale The language of the notices.
 * @returns Each one's answer, or null when the server couldn't be reached.
 */
async function sendItems(operations: QueuedItemOperation[], locale: Locale): Promise<Answers | null> {
  const response = await apiFetch(`${apiUrl()}${SYNC_OPERATIONS_PATH}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ operations: operations.map(sentOperation) }),
  }).catch(() => null);
  if (!response?.ok) {
    return response && refuses(response.status)
      ? await refusedAll(operations, response, locale)
      : null;
  }
  const { results } = syncOperationsResultSchema.parse(await response.json());
  return new Map(
    results.map((result): [string, Answer] => {
      const operation = operations.find((each) => each.id === result.id)!;
      if (result.status === 'conflict') {
        return [result.id, { conflicts: result.conflicts ?? [] }];
      }
      return [result.id, result.status === 'applied' ? {} : { refused: refusedNotice(operation, result, locale) }];
    }),
  );
}

/**
 * Sends a brand's photos, as the photo route takes them: the saved ones kept, the copies and the new files.
 * @param operation The photos.
 * @param locale The language of the notice.
 * @returns Its answer, or null when the server couldn't be reached.
 */
async function sendPhotos(operation: PhotosOperation & QueuedOperation, locale: Locale): Promise<Answers | null> {
  const body = new FormData();
  for (const photo of operation.photos) {
    if ('keep' in photo) {
      body.append(PHOTO_PARTS.keep, photo.keep);
    } else if ('copy' in photo) {
      body.append(PHOTO_PARTS.copy, photo.copy);
    } else {
      // React Native's FormData sends a file given by where it is on the phone.
      body.append(PHOTO_PARTS.file, { uri: photo.file.url, name: photo.file.name, type: photo.file.type } as unknown as Blob);
    }
  }
  const response = await apiFetch(`${apiUrl()}/items/${operation.itemId}/brands/${operation.brandId}/photos`, { method: 'PUT', body }).catch(
    () => null,
  );
  return answerOf(operation, response, locale);
}

/**
 * Sends a name to its list; a vehicle model goes under its brand, found in the copy by name, or added first.
 * @param operation The name.
 * @param locale The language of the notice.
 * @returns Its answer, or null when the server couldn't be reached.
 */
async function sendName(operation: NameOperation & QueuedOperation, locale: Locale): Promise<Answers | null> {
  /** Adds a name to a list, or finds it there. */
  const post = (path: string, body: object) =>
    apiFetch(`${apiUrl()}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
  if (operation.kind !== 'vehicleModels') {
    return answerOf(operation, await post(ITEM_LIST_PATHS[operation.kind], { name: operation.name }), locale);
  }
  const brandName = operation.vehicleBrand ?? '';
  let vehicleBrandId = Object.values(held?.rows.vehicleBrand ?? {}).find((brand) => optionKey(brand.name) === optionKey(brandName))?.id;
  if (!vehicleBrandId) {
    const brand = await post(ITEM_LIST_PATHS.vehicleBrands, { name: brandName });
    if (!brand?.ok) {
      return answerOf(operation, brand, locale);
    }
    vehicleBrandId = listEntrySchema.parse(await brand.json()).id;
  }
  return answerOf(operation, await post(ITEM_LIST_PATHS.vehicleModels, { name: operation.name, vehicleBrandId }), locale);
}

/**
 * Reads the answer to an operation sent on its own.
 * @param operation The operation.
 * @param response What the server answered, or null when it couldn't be reached.
 * @param locale The language of the notice.
 * @returns Accepted or refused, or null when the server couldn't be reached or didn't take it now.
 */
async function answerOf(operation: QueuedOperation, response: Response | null, locale: Locale): Promise<Answers | null> {
  if (response?.ok) {
    return new Map([[operation.id, {}]]);
  }
  return response && refuses(response.status) ? refusedAll([operation], response, locale) : null;
}

/**
 * Says the server refused each of some operations, and why, by the reason of its refusal.
 * @param operations The operations refused.
 * @param response The refusal.
 * @param locale The language of the notices.
 * @returns Each operation's refusal.
 */
async function refusedAll(operations: QueuedOperation[], response: Response, locale: Locale): Promise<Answers> {
  const reason = (await refusalReason(response)) ?? undefined;
  return new Map(operations.map((operation) => [operation.id, { refused: refusedNotice(operation, { reason }, locale) }]));
}

/**
 * Settles a conflict of an operation waiting, keeping the computer's side or the phone's (see
 * @apc/domain/sync-conflicts), and keeps the queue on disk; once its last conflict is settled, the next sync sends it.
 * @param card The conflict.
 * @param keep The side to keep.
 */
export async function settle(card: Pick<ConflictCard, 'operationId' | 'index'>, keep: ConflictSide): Promise<void> {
  await loadCopy();
  queue = settleConflict(queue, card, keep);
  await save();
  changed();
  releasePhotos(heldPhotos(queue));
}

/**
 * Lists the photos the queue still holds on the phone: the new files of the photos waiting.
 * @param operations The queue.
 * @returns Their ids.
 */
function heldPhotos(operations: readonly QueuedOperation[]): string[] {
  return operations.flatMap((operation) => (operation.type === 'savePhotos' ? operation.photos.flatMap((photo) => ('file' in photo ? [photo.id] : [])) : []));
}

/**
 * Deletes the copy, on disk and in memory, and the photos kept with it, as logging out, an expired session or pairing
 * with another server does; the queue stays, to go out once logged in again, unless the server changed.
 * @param options Whether the queue stays.
 */
export async function clearCopy(options: { keepQueue?: boolean } = {}): Promise<void> {
  if (options.keepQueue) {
    await loadCopy();
  }
  generation += 1;
  // A sync still running keeps nothing; the next one starts over.
  running = null;
  following = null;
  held = emptyCopy();
  if (!options.keepQueue) {
    queue = [];
  }
  await Promise.all([
    queue.length > 0 ? save() : native.clear().catch(() => {}),
    clearPhotos(),
    options.keepQueue ? Promise.resolve() : releasePhotos([]),
  ]);
  changed();
}

/**
 * Opens the copy behind the phone's lock: asks for it (fingerprint, face or screen lock) when the copy is kept behind
 * one, and keeps the copy's key in memory until lockCopy (see InventoryCopyModule.kt).
 * @param prompt The prompt's title and what it says under it.
 * @returns Whether the copy can be read now.
 */
export function unlockCopy(prompt: { title: string; subtitle: string }): Promise<UnlockResult> {
  return native.unlock(prompt.title, prompt.subtitle);
}

/** Drops the copy's key from memory, so reading or writing the copy waits for unlockCopy. */
export function lockCopy(): Promise<void> {
  return native.lock();
}

/**
 * Tells whether the phone has a screen lock to keep the copy behind.
 * @returns True when it has one.
 */
export function hasScreenLock(): Promise<boolean> {
  return native.hasLock();
}

/** Opens Android's settings for the screen lock. */
export function openLockSettings(): void {
  native.openLockSettings();
}

/**
 * Calls a function each time the copy or the queue changes.
 * @param listener The function.
 * @returns What stops the calls.
 */
export function onCopyChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Calls a function with why the server refused operations of the queue, each time it does.
 * @param listener The function, given a notice per operation refused.
 * @returns What stops the calls.
 */
export function onRefused(listener: (notices: string[]) => void): () => void {
  refusalListeners.add(listener);
  return () => refusalListeners.delete(listener);
}
