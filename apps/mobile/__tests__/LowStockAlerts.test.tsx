/**
 * @format
 */

import React, { useState } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import type { Item } from '@apc/shared/items';
import { lowStockKey, notificationsKey, type Notification } from '@apc/shared/notifications';
import { MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens';
import { Button } from '../src/Button';
import { NotificationsMenu } from '../src/notifications/NotificationsMenu';
import { useLowStockAlerts } from '../src/notifications/useLowStockAlerts';
import { themeStorage, ThemeProvider } from '../src/theme';
import { ToastProvider } from '../src/Toast';
import { testItem } from '@apc/shared/test-items';

const SAFE_AREA = { frame: { x: 0, y: 0, width: MIN_MOBILE_WIDTH, height: MIN_MOBILE_HEIGHT }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const USER_ID = 'user-christian';
const FILTER = item('a', 'Filtro de óleo', 8, 2);
const PADS = item('b', 'Pastilha de freio', 9, 3);
const PUMP = item('c', "Bomba d'água", 4, 1);
// The trees rendered by the test running, unmounted after it so no toast timer outlives it.
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

/**
 * Builds an item with the fields the warning looks at.
 * @param id Its id.
 * @param name Its name.
 * @param quantity Units in stock.
 * @param minQuantity Its minimum.
 * @returns A complete item.
 */
function item(id: string, name: string, quantity: number, minQuantity: number): Item {
  return testItem({
    id,
    code: id.toUpperCase(),
    name,
    category: 'Motor',
    partBrand: 'Mann',
    vehicleBrand: 'Volkswagen',
    vehicleModel: null,
    position: 'N/A',
    side: 'N/A',
    color: 'N/A',
    location: null,
    quantity,
    minQuantity,
    unitPriceCents: 100,
    photos: [],
    createdAt: '2026-10-03T12:00:00.000Z',
    updatedAt: '2026-10-03T12:00:00.000Z',
  });
}

/**
 * Reads the notifications kept for the user, newest first.
 * @returns Each one's kind and message.
 */
async function kept(): Promise<[string, string][]> {
  const list = JSON.parse((await themeStorage.getItem(notificationsKey(USER_ID))) ?? '[]') as Notification[];
  return list.map((notification) => [notification.kind, notification.message]);
}

/**
 * Presses a button by its text.
 * @param tree Rendered tree.
 * @param name The button's text.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, name: string) {
  const node = tree.root.find(
    (n) => typeof n.type !== 'string' && typeof n.props.onPress === 'function' && n.findAll((c) => c.type === Text && c.props.children === name).length > 0,
  );
  await ReactTestRenderer.act(async () => node.props.onPress());
}

/**
 * Reads the messages of the toasts on screen.
 * @param tree Rendered tree.
 * @returns Each toast's message.
 */
function toasts(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root.findAll((n) => n.props.testID === 'common.toast.message.text' && typeof n.type === 'string').map((n) => n.props.children);
}

beforeEach(async () => {
  await themeStorage.clear();
});

afterEach(async () => {
  await ReactTestRenderer.act(async () => mounted.splice(0).forEach((tree) => tree.unmount()));
});

// Opens the stock with a low item: the bell gets the warning, without a toast. Saving it still low warns nothing more;
// two items reaching their minimum at once (an import) make one warning, shown as a toast; one restocked and low again
// is warned about again.
test('Mobile: items reaching their minimum stock are warned about once while low', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>
          <ToastProvider>
            <Sample initial={[{ ...FILTER, quantity: 2 }, PADS, PUMP]} />
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(tree!);
  expect(await kept()).toEqual([['warning', 'Estoque baixo: “Filtro de óleo” (2 de 2)']]);
  expect(toasts(tree!)).toEqual([]);
  expect(JSON.parse((await themeStorage.getItem(lowStockKey(USER_ID)))!)).toEqual(['a']);

  await press(tree!, 'Filtro ainda baixo');
  await press(tree!, 'Importar baixos');
  expect(toasts(tree!)).toEqual(['Estoque baixo em 2 itens']);
  expect(await kept()).toEqual([
    ['warning', 'Estoque baixo em 2 itens'],
    ['warning', 'Estoque baixo: “Filtro de óleo” (2 de 2)'],
  ]);

  await press(tree!, 'Repor filtro');
  await press(tree!, 'Filtro ainda baixo');
  expect((await kept())[0]).toEqual(['warning', 'Estoque baixo: “Filtro de óleo” (1 de 2)']);
  expect(await kept()).toHaveLength(3);
});

function Sample({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial);
  useLowStockAlerts(items, USER_ID);
  return (
    <>
      <NotificationsMenu userId={USER_ID} />
      <Button onPress={() => setItems([{ ...FILTER, quantity: 1 }, PADS, PUMP])}>Filtro ainda baixo</Button>
      <Button onPress={() => setItems([{ ...FILTER, quantity: 1 }, { ...PADS, quantity: 3 }, { ...PUMP, quantity: 0 }])}>Importar baixos</Button>
      <Button onPress={() => setItems([FILTER, { ...PADS, quantity: 3 }, { ...PUMP, quantity: 0 }])}>Repor filtro</Button>
    </>
  );
}
