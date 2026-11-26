/**
 * @format
 */

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { testItem } from '@apc/domain/test-items';
import { syncPageOf } from '@apc/domain/test-sync';
import type { SyncChanges } from '@apc/domain/sync';
import { clearCopy, enqueue, loadCopy, loadQueue, onRefused, syncCopy } from './inventoryCopy';
import { copyItems } from '@apc/domain/sync-copy';
import { withQueue, type QueuedOperation } from '@apc/domain/sync-queue';
import type { RefusalReason } from '@apc/domain/refusals';
import { LOCALE_STORAGE_KEY } from '@apc/domain/locale';
import { themeStorage } from '../../app/theme';

// The phone's copy of the inventory against a stand-in server: a full copy first, then the changes after its cursor, a
// full copy again when the server answers 410, the copy kept as it was while the server can't be reached, and nothing
// left of it once cleared. And the queue of the changes made on the phone: sent in order before the copy syncs, kept
// while the server can't be reached and sent again later, shown over the copy until a sync brings them in, dropped
// when refused, saying why, and kept across an expired session; and a copy behind the phone's lock, not taken for none
// while it is locked. The native side's encrypted file is the setup's in-memory stand-in.

/** When the queued changes of the tests were made. */
const AT = '2026-11-23T12:00:00.000Z';

/** The native side that keeps the copy encrypted (InventoryCopyModule.kt), as the setup stands in for it. */
const native = NativeModules.InventoryCopy as { read: jest.Mock; write: jest.Mock; clear: jest.Mock };
/** Two items in stock. */
const ITEMS = [
  testItem({ id: '00000000-0000-4000-8000-000000000001', name: 'Filtro de óleo', code: 'W 712' }),
  testItem({ id: '00000000-0000-4000-8000-000000000002', name: 'Pastilha de freio', code: 'N-123' }),
];

/**
 * Answers the change feed with the pages a test gives, by the cursor asked from ("" for none), and 410 to any other.
 * @param pages The page for each cursor.
 * @returns The URLs asked, without the server's address.
 */
function answerFeed(pages: Record<string, SyncChanges | 'offline'>): string[] {
  const asked: string[] = [];
  (fetch as jest.Mock).mockImplementation(async (url: string) => {
    const { pathname, search, searchParams } = new URL(url);
    asked.push(pathname + search);
    const page = pages[searchParams.get('since') ?? ''];
    if (page === 'offline') {
      throw new TypeError('Network request failed');
    }
    return page ? { ok: true, status: 200, json: async () => page } : Response.json({ statusCode: 410, error: 'Gone', message: 'Make a full copy.', reason: 'cursorGone' }, { status: 410 });
  });
  return asked;
}

// Syncs with no copy, then again, and checks the first asks for a full copy and writes it to disk, and the second asks
// for the changes after its cursor, which rename an item and delete the other.
test('Mobile: the copy starts with a full copy, then asks for the changes after its cursor', async () => {
  const full = syncPageOf(ITEMS, 'db.10');
  const item = full.changes.find((change) => change.kind === 'item' && change.id === ITEMS[0].id)!;
  const asked = answerFeed({
    '': full,
    'db.10': {
      changes: [
        { ...item, version: 11, row: { ...(item.row as object), name: 'Filtro de ar' } } as SyncChanges['changes'][number],
        { kind: 'itemBrand', id: ITEMS[1].brands[0].id, version: 12, row: null },
        { kind: 'item', id: ITEMS[1].id, version: 13, row: null },
      ],
      cursor: 'db.13',
      more: false,
    },
  });
  expect(await syncCopy()).toBe('synced');
  expect(copyItems(await loadCopy()).map((each) => each.name).sort()).toEqual(['Filtro de óleo', 'Pastilha de freio']);
  expect(JSON.parse(native.write.mock.calls.at(-1)[0]).cursor).toBe('db.10');

  expect(await syncCopy()).toBe('synced');
  expect(asked).toEqual(['/sync/changes', '/sync/changes?since=db.10']);
  const copy = await loadCopy();
  expect(copyItems(copy).map((each) => each.name)).toEqual(['Filtro de ar']);
  expect(copy.cursor).toBe('db.13');
});

// Syncs a copy whose cursor the server no longer follows and checks it asks for a full copy at once, which replaces the
// copy, so an item deleted meanwhile, which no tombstone tells of anymore, is gone too.
test('Mobile: a cursor the server answers 410 makes the copy again from a full copy', async () => {
  answerFeed({ '': syncPageOf(ITEMS, 'db.10') });
  await syncCopy();
  const asked = answerFeed({ '': syncPageOf([ITEMS[0]], 'other.5') });
  expect(await syncCopy()).toBe('synced');
  expect(asked).toEqual(['/sync/changes?since=db.10', '/sync/changes']);
  expect(copyItems(await loadCopy()).map((each) => each.id)).toEqual([ITEMS[0].id]);
});

// Syncs a copy while the server can't be reached, and while its pages stop halfway, and checks the copy stays as it
// was, cursor included, and nothing new is written to disk.
test('Mobile: a sync that can\'t reach the server keeps the copy as it was', async () => {
  answerFeed({ '': syncPageOf(ITEMS, 'db.10') });
  await syncCopy();
  const writes = native.write.mock.calls.length;
  answerFeed({ 'db.10': 'offline' });
  expect(await syncCopy()).toBe('offline');
  answerFeed({ 'db.10': { changes: [{ kind: 'item', id: ITEMS[0].id, version: 11, row: null }], cursor: 'db.11', more: true }, 'db.11': 'offline' });
  expect(await syncCopy()).toBe('offline');
  const copy = await loadCopy();
  expect(copy.cursor).toBe('db.10');
  expect(copyItems(copy)).toHaveLength(2);
  expect(native.write.mock.calls).toHaveLength(writes);
});

// Starts the app again with a copy on disk and checks it is read from there, not asked of the server.
test('Mobile: a copy on disk is read back as the app starts again', async () => {
  answerFeed({ '': syncPageOf(ITEMS, 'db.10') });
  await syncCopy();
  await jest.isolateModulesAsync(async () => {
    const again = require('./inventoryCopy') as typeof import('./inventoryCopy');
    const copy = await again.loadCopy();
    expect(copy.cursor).toBe('db.10');
    expect(copyItems(copy)).toHaveLength(2);
  });
});

// Asks for a sync while one is on its way, as after a change made on the server meanwhile, and checks a second sync
// follows the first, bringing the change, and that asking a third time before it starts gets that same one.
test('Mobile: a sync asked for while one runs gets another after it', async () => {
  let answer = (_page: unknown) => {};
  const asked: string[] = [];
  (fetch as jest.Mock).mockImplementation((url: string) => {
    asked.push(url);
    return asked.length === 1
      ? new Promise((resolve) => (answer = (page) => resolve({ ok: true, status: 200, json: async () => page })))
      : Promise.resolve({ ok: true, status: 200, json: async () => syncPageOf([ITEMS[0]], 'db.20') });
  });
  const first = syncCopy();
  const second = syncCopy();
  const third = syncCopy();
  expect(third).toBe(second);
  await new Promise<void>((resolve) => setImmediate(resolve));
  answer(syncPageOf(ITEMS, 'db.10'));
  expect(await first).toBe('synced');
  expect(await second).toBe('synced');
  expect(asked.map((url) => url.replace(/^.*\/sync/, '/sync'))).toEqual(['/sync/changes', '/sync/changes?since=db.10']);
  expect((await loadCopy()).cursor).toBe('db.20');
});

/**
 * Answers the server as a stand-in that applies nothing: the change feed with the pages a test gives, a phone's
 * operations with the results a test gives (applied by default), and the photo and list routes as accepted; or every
 * request unreachable while offline.
 * @param feed The change feed's page for each cursor.
 * @param refused The results of the operations refused, by id.
 * @returns The requests, e.g. "POST /sync/operations moveStock,deleteItem", and whether the server is offline.
 */
function answerServer(feed: Record<string, SyncChanges>, refused: Record<string, { statusCode: number; reason: RefusalReason; details?: object[] }> = {}) {
  const server = { asked: [] as string[], offline: false };
  (fetch as jest.Mock).mockImplementation(async (url: string, init?: RequestInit) => {
    const { pathname, search, searchParams } = new URL(url);
    const method = init?.method ?? 'GET';
    if (server.offline) {
      throw new TypeError('Network request failed');
    }
    if (pathname === '/sync/operations') {
      const { operations } = JSON.parse(String(init?.body)) as { operations: QueuedOperation[] };
      server.asked.push(`POST ${pathname} ${operations.map((operation) => operation.type).join(',')}`);
      const results = operations.map((operation) => ({ id: operation.id, status: refused[operation.id] ? 'refused' : 'applied', statusCode: refused[operation.id]?.statusCode ?? 200, reason: refused[operation.id]?.reason, details: refused[operation.id]?.details }));
      return { ok: true, status: 200, json: async () => ({ results }) };
    }
    server.asked.push(`${method} ${pathname}${search}`);
    if (pathname === '/sync/changes') {
      const page = feed[searchParams.get('since') ?? ''];
      return page ? { ok: true, status: 200, json: async () => page } : Response.json({ statusCode: 410, error: 'Gone', message: 'Make a full copy.', reason: 'cursorGone' }, { status: 410 });
    }
    return { ok: true, status: 200, json: async () => ({ id: '00000000-0000-4000-8000-0000000000c1', name: 'Gurgel' }) };
  });
  return server;
}

/**
 * Makes a queued change of an item.
 * @param id The change's number.
 * @param fields Its type and fields.
 * @returns The change.
 */
function queued(id: number, fields: Record<string, unknown>): QueuedOperation {
  return { id: `20000000-0000-4000-8000-${String(id).padStart(12, '0')}`, at: AT, label: 'Filtro de óleo', ...fields } as QueuedOperation;
}

// Queues a stock move, a delete, a brand's photos and a vehicle model under a brand the copy doesn't hold, then syncs,
// and checks they go out in their order, the item operations in one batch, the photo route and the list's routes after
// it, the model's brand added first, and only then is the feed read; once the copy holds them, they leave the queue and
// the photo held for them is released.
test('Mobile: the queue goes out in order before the copy syncs, and leaves once the copy holds it', async () => {
  const server = answerServer({ '': syncPageOf(ITEMS, 'db.10'), 'db.10': { changes: [], cursor: 'db.10', more: false } });
  await syncCopy();
  server.asked.length = 0;
  await enqueue([
    queued(1, { type: 'moveStock', itemId: ITEMS[0].id, brandId: ITEMS[0].brands[0].id, delta: -1 }),
    queued(2, { type: 'deleteItem', itemId: ITEMS[1].id }),
    queued(3, { type: 'savePhotos', itemId: ITEMS[0].id, brandId: ITEMS[0].brands[0].id, photos: [{ file: { url: 'file:///held/p1', name: 'p1.jpg', type: 'image/jpeg' }, id: 'p1' }] }),
    queued(4, { type: 'addName', kind: 'vehicleModels', name: 'X12', vehicleBrand: 'Gurgel' }),
  ]);
  expect(await syncCopy()).toBe('synced');
  expect(server.asked).toEqual([
    'POST /sync/operations moveStock,deleteItem',
    `PUT /items/${ITEMS[0].id}/brands/${ITEMS[0].brands[0].id}/photos`,
    'POST /vehicle-brands',
    'POST /vehicle-models',
    'GET /sync/changes?since=db.10',
  ]);
  const model = (fetch as jest.Mock).mock.calls.find(([url]) => String(url).endsWith('/vehicle-models'));
  expect(JSON.parse(model[1].body)).toEqual({ name: 'X12', vehicleBrandId: '00000000-0000-4000-8000-0000000000c1' });
  expect(await loadQueue()).toEqual([]);
  expect(NativeModules.PhotoCache.release).toHaveBeenLastCalledWith([]);
});

// Queues a delete while the server can't be reached and checks the sync says so, the change waits, unsent, and the
// copy with the queue over it no longer shows the item; then the server answers the change but not the feed, and the
// change stays over the copy, marked sent, until a later sync brings it in, with nothing sent twice.
test('Mobile: a change waits while the server can\'t be reached, and shows over the copy until a sync brings it in', async () => {
  const server = answerServer({ '': syncPageOf(ITEMS, 'db.10') });
  await syncCopy();
  server.offline = true;
  await enqueue([queued(1, { type: 'deleteItem', itemId: ITEMS[1].id })]);
  expect(await syncCopy()).toBe('offline');
  expect((await loadQueue()).map((each) => each.sent)).toEqual([undefined]);
  const shown = () => Promise.all([loadCopy(), loadQueue()]).then(([copy, queue]) => copyItems(withQueue(copy, queue)).map((each) => each.id));
  expect(await shown()).toEqual([ITEMS[0].id]);

  server.offline = false;
  server.asked.length = 0;
  const answered = (fetch as jest.Mock).getMockImplementation()!;
  (fetch as jest.Mock).mockImplementation(async (url: string, init?: RequestInit) => {
    if (new URL(url).pathname === '/sync/changes') {
      throw new TypeError('Network request failed');
    }
    return answered(url, init);
  });
  expect(await syncCopy()).toBe('offline');
  expect((await loadQueue()).map((each) => each.sent)).toEqual([true]);
  expect(await shown()).toEqual([ITEMS[0].id]);

  const deleted = { changes: [{ kind: 'item' as const, id: ITEMS[1].id, version: 11, row: null }], cursor: 'db.11', more: false };
  const later = answerServer({ 'db.10': deleted });
  expect(await syncCopy()).toBe('synced');
  expect(later.asked).toEqual(['GET /sync/changes?since=db.10']);
  expect(await loadQueue()).toEqual([]);
  expect(await shown()).toEqual([ITEMS[0].id]);
});

// Queues a new item whose code another item uses, its photos, and a move on another item, and checks the server's
// refusal of the new item drops it and its photos, unsent, the listeners hearing why, while the move goes on.
test('Mobile: a refused change leaves the queue with what waits on its new item, saying why', async () => {
  const created = queued(1, {
    type: 'createItem',
    itemId: '30000000-0000-4000-8000-000000000001',
    item: { name: 'Filtro de óleo', category: 'Motor', vehicles: [{ vehicleBrand: 'Volkswagen' }], brands: [{ id: '30000000-0000-4000-8000-0000000000b1', partBrand: 'Mann', code: 'N-123', unitPriceCents: 3990 }] },
  });
  const server = answerServer(
    { '': syncPageOf(ITEMS, 'db.10') },
    { [created.id]: { statusCode: 409, reason: 'codeTaken', details: [{ code: 'N-123', itemName: 'Pastilha de freio' }] } },
  );
  const heard = jest.fn();
  const stop = onRefused(heard);
  await enqueue([
    created,
    queued(2, { type: 'moveStock', itemId: ITEMS[0].id, brandId: ITEMS[0].brands[0].id, delta: 2 }),
    queued(3, { type: 'savePhotos', itemId: '30000000-0000-4000-8000-000000000001', brandId: '30000000-0000-4000-8000-0000000000b1', photos: [] }),
  ]);
  expect(await syncCopy()).toBe('synced');
  stop();
  expect(heard).toHaveBeenCalledWith(['O servidor recusou o cadastro de “Filtro de óleo”: o código N-123 já é usado por “Pastilha de freio”.']);
  expect(server.asked.filter((asked) => !asked.startsWith('GET'))).toEqual(['POST /sync/operations createItem,moveStock']);
  expect(await loadQueue()).toEqual([]);
});

// The same refusal with English kept on the phone: the server's reason, not its message, says the code is taken, so the
// notice reads in English.
test('Mobile: a refused change is said in English, by the refusal\'s reason', async () => {
  await themeStorage.setItem(LOCALE_STORAGE_KEY, 'en-US');
  const created = queued(1, {
    type: 'createItem',
    itemId: '30000000-0000-4000-8000-000000000001',
    item: { name: 'Filtro de óleo', category: 'Motor', vehicles: [{ vehicleBrand: 'Volkswagen' }], brands: [{ id: '30000000-0000-4000-8000-0000000000b1', partBrand: 'Mann', code: 'N-123', unitPriceCents: 3990 }] },
  });
  answerServer({ '': syncPageOf(ITEMS, 'db.10') }, { [created.id]: { statusCode: 409, reason: 'codeTaken', details: [{ code: 'N-123', itemName: 'Pastilha de freio' }] } });
  const heard = jest.fn();
  const stop = onRefused(heard);
  await enqueue([created]);
  expect(await syncCopy()).toBe('synced');
  stop();
  await themeStorage.removeItem(LOCALE_STORAGE_KEY);
  expect(heard).toHaveBeenCalledWith(['The server refused the creation of “Filtro de óleo”: code N-123 is already used by “Pastilha de freio”.']);
});

// Queues a change, then clears the copy as an expired session does, and checks the copy is gone and the change kept on
// disk, read back as the app starts again, and sent once logged in again; then pairs with another server and checks
// the change is gone too, with its file and the photos held for it.
test('Mobile: an expired session keeps the queue, which goes out once logged in again; another server clears it', async () => {
  answerServer({ '': syncPageOf(ITEMS, 'db.10') });
  await syncCopy();
  const waiting = queued(1, { type: 'deleteItem', itemId: ITEMS[1].id });
  await enqueue([waiting]);
  await clearCopy({ keepQueue: true });
  expect(copyItems(await loadCopy())).toEqual([]);
  expect(JSON.parse(native.write.mock.calls.at(-1)[0]).queue).toEqual([waiting]);
  await jest.isolateModulesAsync(async () => {
    const again = require('./inventoryCopy') as typeof import('./inventoryCopy');
    expect(await again.loadQueue()).toEqual([waiting]);
  });
  const server = answerServer({ '': syncPageOf(ITEMS, 'db.12') });
  expect(await syncCopy()).toBe('synced');
  expect(server.asked).toEqual(['POST /sync/operations deleteItem', 'GET /sync/changes']);

  await enqueue([queued(2, { type: 'deleteItem', itemId: ITEMS[0].id })]);
  native.clear.mockClear();
  await clearCopy();
  expect(await loadQueue()).toEqual([]);
  expect(native.clear).toHaveBeenCalled();
  expect(NativeModules.PhotoCache.release).toHaveBeenLastCalledWith([]);
});

// On Android 17 without the access to the local network, syncs with a change waiting, and checks the sync says the
// phone is blocked without asking the server anything, the change still waiting.
test('Mobile: a sync without the local network access asks nothing, and says so', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(37);
  jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
  try {
    await enqueue([queued(1, { type: 'deleteItem', itemId: ITEMS[1].id })]);
    (fetch as jest.Mock).mockClear();
    expect(await syncCopy()).toBe('blocked');
    expect(fetch).not.toHaveBeenCalled();
    expect((await loadQueue()).map((each) => each.sent)).toEqual([undefined]);
  } finally {
    jest.restoreAllMocks();
  }
});

// Clears the copy while a sync is on its way, as logging out does, and checks the copy and its file are gone and the
// sync that comes back afterwards keeps nothing.
test('Mobile: clearing the copy deletes it, and a sync still running keeps nothing', async () => {
  let answer = (_page: unknown) => {};
  (fetch as jest.Mock).mockImplementation(
    () => new Promise((resolve) => (answer = (page) => resolve({ ok: true, status: 200, json: async () => page }))),
  );
  const running = syncCopy();
  await new Promise<void>((resolve) => setImmediate(resolve));
  await clearCopy();
  answer(syncPageOf(ITEMS, 'db.10'));
  expect(await running).toBe('offline');
  expect(native.clear).toHaveBeenCalled();
  const copy = await loadCopy();
  expect(copy.cursor).toBeNull();
  expect(copyItems(copy)).toEqual([]);
});

// Starts the app again with the copy on disk behind the phone's lock, not yet confirmed, and checks reading it is
// refused rather than taken for no copy, so nothing is written over it; then, once open, that it reads back whole.
test('Mobile: a copy behind the phone\'s lock isn\'t taken for no copy until it opens', async () => {
  answerFeed({ '': syncPageOf(ITEMS, 'db.10') });
  await syncCopy();
  const writes = native.write.mock.calls.length;
  await jest.isolateModulesAsync(async () => {
    const again = require('./inventoryCopy') as typeof import('./inventoryCopy');
    native.read.mockRejectedValueOnce(Object.assign(new Error('The copy is locked.'), { code: 'locked' }));
    await expect(again.loadCopy()).rejects.toMatchObject({ code: 'locked' });
    expect(native.write.mock.calls).toHaveLength(writes);
    const copy = await again.loadCopy();
    expect(copy.cursor).toBe('db.10');
    expect(copyItems(copy)).toHaveLength(2);
  });
});
