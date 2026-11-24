/**
 * @format
 */

import { NativeModules } from 'react-native';
import type { SessionUser } from '@apc/domain/auth';
import { lowStockKey } from '@apc/domain/notifications';
import { testItem } from '@apc/domain/test-items';
import { syncPageOf } from '@apc/domain/test-sync';
import type { Item } from '@apc/domain/items';
import { themeStorage } from '../src/app/theme';
import { auth } from '../src/features/auth/auth';
import { backgroundSync } from '../src/features/inventory/backgroundSync';
import { enqueue } from '../src/features/inventory/inventoryCopy';

// The copy's sync while the app is out of sight: it syncs the copy and shows in the Android shade the items newly at
// their minimum, once while they stay there and never the ones the bell already said, and why the server refused a
// change sent; with no session, or a copy behind the phone's lock, it does nothing. The server, the session and the
// native side are stand-ins.

/** The native sides the task reaches, as the setup stands in for them. */
const native = NativeModules as unknown as { SystemNotifications: { show: jest.Mock }; InventoryCopy: { read: jest.Mock } };
const USER = { id: 'user-christian' } as SessionUser;
/** An item at its minimum, and one well above it. */
const LOW = testItem({ id: '00000000-0000-4000-8000-000000000001', name: 'Filtro de óleo', code: 'W 712', quantity: 2, minQuantity: 3 });
const FULL = testItem({ id: '00000000-0000-4000-8000-000000000002', name: 'Pastilha de freio', code: 'N-123', quantity: 9, minQuantity: 1 });

/**
 * Answers the change feed with a full copy of some items, and a batch of operations by refusing each.
 * @param items The items in stock.
 */
function answer(items: Item[]) {
  (fetch as jest.Mock).mockImplementation(async (url: string, init?: RequestInit) => {
    if (new URL(url).pathname === '/sync/operations') {
      const { operations } = JSON.parse(String(init?.body)) as { operations: { id: string }[] };
      const results = operations.map((operation) => ({ id: operation.id, status: 'refused', statusCode: 404 }));
      return { ok: true, status: 200, json: async () => ({ results }) };
    }
    return { ok: true, status: 200, json: async () => syncPageOf(items, 'db.10') };
  });
}

beforeEach(async () => {
  await themeStorage.clear();
  native.SystemNotifications.show.mockClear();
  jest.spyOn(auth, 'currentUser').mockResolvedValue(USER);
});

afterEach(() => jest.restoreAllMocks());

// Syncs a stock with an item at its minimum and checks the shade warns of it; then syncs again and checks it isn't
// repeated while it stays low.
test('Mobile: the background sync shows the items newly at their minimum in the shade, once', async () => {
  answer([LOW, FULL]);
  await backgroundSync();
  expect(native.SystemNotifications.show.mock.calls).toEqual([['Aviso', 'Estoque baixo: “Filtro de óleo” (2 de 3)']]);
  await backgroundSync();
  expect(native.SystemNotifications.show).toHaveBeenCalledTimes(1);
});

// Marks the low item as already said by the bell and checks the background sync doesn't say it again.
test('Mobile: the background sync leaves out the items the bell already warned about', async () => {
  await themeStorage.setItem(lowStockKey(USER.id), JSON.stringify([LOW.id]));
  answer([LOW, FULL]);
  await backgroundSync();
  expect(native.SystemNotifications.show).not.toHaveBeenCalled();
});

// Queues a delete the server refuses and checks the shade says why, as an error.
test('Mobile: a change the server refuses in the background is shown in the shade', async () => {
  answer([FULL]);
  await enqueue([{ id: '10000000-0000-4000-8000-000000000001', type: 'deleteItem', itemId: LOW.id, at: '2026-11-24T12:00:00.000Z', label: 'Filtro de óleo' }]);
  await backgroundSync();
  expect(native.SystemNotifications.show.mock.calls).toEqual([['Erro', 'O servidor recusou a exclusão de “Filtro de óleo”: o item não existe mais no servidor.']]);
});

// Runs with no session, then with the copy behind the phone's lock, and checks neither asks the server anything.
test('Mobile: with no session, or the copy behind the phone\'s lock, the background sync does nothing', async () => {
  answer([LOW]);
  (fetch as jest.Mock).mockClear();
  jest.spyOn(auth, 'currentUser').mockResolvedValue(null);
  await backgroundSync();
  expect(fetch).not.toHaveBeenCalled();

  await jest.isolateModulesAsync(async () => {
    jest.spyOn(require('../src/features/auth/auth').auth, 'currentUser').mockResolvedValue(USER);
    native.InventoryCopy.read.mockRejectedValueOnce(Object.assign(new Error('The copy is locked.'), { code: 'locked' }));
    const isolated = require('../src/features/inventory/backgroundSync') as typeof import('../src/features/inventory/backgroundSync');
    await isolated.backgroundSync();
  });
  expect(fetch).not.toHaveBeenCalled();
  expect(native.SystemNotifications.show).not.toHaveBeenCalled();
});
