/**
 * @format
 */

import { NativeModules } from 'react-native';
import { testItem } from '@apc/domain/test-items';
import { syncPageOf } from '@apc/domain/test-sync';
import type { SyncChanges } from '@apc/domain/sync';
import { clearCopy, loadCopy, syncCopy } from '../src/features/inventory/inventoryCopy';
import { copyItems } from '@apc/domain/sync-copy';

// The phone's copy of the inventory against a stand-in server: a full copy first, then the changes after its cursor, a
// full copy again when the server answers 410, the copy kept as it was while the server can't be reached, and nothing
// left of it once cleared. The native side's encrypted file is the setup's in-memory stand-in.

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
    return page ? { ok: true, status: 200, json: async () => page } : { ok: false, status: 410, json: async () => ({}) };
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
    const again = require('../src/features/inventory/inventoryCopy') as typeof import('../src/features/inventory/inventoryCopy');
    const copy = await again.loadCopy();
    expect(copy.cursor).toBe('db.10');
    expect(copyItems(copy)).toHaveLength(2);
  });
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
