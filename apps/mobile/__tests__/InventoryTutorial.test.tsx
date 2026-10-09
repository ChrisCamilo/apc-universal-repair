/**
 * @format
 */

import React from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { INVENTORY_TUTORIAL_STORAGE_KEY, TUTORIAL_ITEM } from '@apc/shared/inventory-tutorial';
import { matchesSearch, type Item } from '@apc/shared/items';
import { ITEM_LIST_PATHS } from '@apc/shared/lists';
import { MOBILE_DESIGN_HEIGHT, MOBILE_DESIGN_WIDTH } from '@apc/shared/screens';
import { InventoryTab } from '../src/dashboard/InventoryTab';
import { InventoryTutorialContext, useInventoryTutorialChoice } from '../src/dashboard/inventoryTutorialContext';
import { OpenItemOnRowContext, useOpenItemOnRowChoice } from '../src/dashboard/openItemOnRowContext';
import { PageSizeContext, usePageSizeChoice } from '../src/dashboard/pageSizeContext';
import { themeStorage, ThemeProvider } from '../src/theme';
import { ToastProvider } from '../src/Toast';
import { TourProvider } from '../src/Tour';

// A phone's screen with no notch, so the tour card and the toast have their insets.
const SAFE_AREA = { frame: { x: 0, y: 0, width: MOBILE_DESIGN_WIDTH, height: MOBILE_DESIGN_HEIGHT }, insets: { top: 0, right: 0, bottom: 0, left: 0 } };
// Trees the test rendered, unmounted after it so the timers don't outlive the test.
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

/**
 * Answers the API as it would, keeping what is sent: the items (narrowed by the search), empty lists, and new,
 * changed and deleted items.
 * @param stock The items in stock, changed as requests come.
 * @returns The requests that changed the stock, e.g. "POST /items".
 */
function answerApi(stock: Item[]): string[] {
  const changes: string[] = [];
  (fetch as jest.Mock).mockImplementation(async (url: string, init?: RequestInit) => {
    const { pathname, searchParams } = new URL(url);
    const method = init?.method ?? 'GET';
    const reply = (body: unknown, status = 200) => ({ ok: true, status, json: () => Promise.resolve(body) });
    if (Object.values(ITEM_LIST_PATHS).includes(pathname)) {
      return reply([]);
    }
    if (method === 'GET') {
      const matching = stock.filter((held) => matchesSearch(held, searchParams.get('q') ?? ''));
      return reply({ items: matching, total: matching.length });
    }
    changes.push(`${method} ${pathname.replace(/[0-9a-f-]{36}$/, ':id')}`);
    if (method === 'POST') {
      const sent = JSON.parse(String(init?.body));
      const saved = { ...sent, id: '00000000-0000-4000-8000-0000000000aa', photos: [], vehicleModel: sent.vehicleModel || null };
      stock.unshift({ ...saved, location: sent.location || null, createdAt: '2026-10-08T12:00:00.000Z', updatedAt: '2026-10-08T12:00:00.000Z' });
      return reply(saved, 201);
    }
    stock.splice(0, stock.length, ...stock.filter((held) => !pathname.endsWith(held.id)));
    return reply(null, 204);
  });
  return changes;
}

/**
 * Renders the Inventory tab with the Dashboard's preferences, the toasts and the tour, and lets the items load.
 * @returns The rendered tree.
 */
async function mount() {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>
          <ToastProvider>
            <TourProvider>
              <Preferences>
                <InventoryTab />
              </Preferences>
            </TourProvider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(tree!);
  await wait(0);
  return tree!;
}

/**
 * Presses the last pressable with an accessible name or visible text.
 * @param tree Rendered tree.
 * @param name The accessibility label, or the text inside.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, name: string) {
  const nodes = tree.root.findAll(
    (n) =>
      typeof n.props.onPress === 'function' &&
      (n.props.accessibilityLabel === name || n.findAll((c) => c.type === Text && c.props.children === name).length > 0),
  );
  await ReactTestRenderer.act(async () => nodes[nodes.length - 1].props.onPress());
}

/**
 * Lists the texts on screen.
 * @param tree Rendered tree.
 * @returns Every Text's string.
 */
function texts(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root.findAll((n) => n.type === Text && typeof n.props.children !== 'object').map((n) => String(n.props.children));
}

/**
 * Lets time pass, for the tour's checks and the requests.
 * @param ms How long, in ms.
 */
async function wait(ms: number) {
  for (let left = ms; left >= 0; left -= 100) {
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(Math.min(100, left));
    });
  }
}

beforeEach(async () => {
  jest.useFakeTimers();
  await themeStorage.clear();
});

afterEach(async () => {
  await ReactTestRenderer.act(async () => mounted.splice(0).forEach((tree) => tree.unmount()));
  jest.useRealTimers();
});

// Opens the Inventory tab for the first time and checks the tutorial starts by itself on its first step, and is
// saved as seen; then part 1 is done with "Fazer por mim", which opens and fills the form and saves the test item,
// and the tutorial moves on to the search.
test('Mobile: the Inventory tutorial starts by itself and creates the test item', async () => {
  const stock: Item[] = [];
  const changes = answerApi(stock);
  const tree = await mount();
  expect(texts(tree)).toEqual(expect.arrayContaining(['Parte 1 de 3 · Cadastrar um item', 'Abra o cadastro']));
  expect(await themeStorage.getItem(INVENTORY_TUTORIAL_STORAGE_KEY)).toBe('true');

  for (const title of ['Abra o cadastro', 'Diga que peça é', 'Diga onde e quantas', 'Salve o item']) {
    expect(texts(tree)).toContain(title);
    await press(tree, 'Fazer por mim');
    await wait(1000);
  }
  expect(changes).toEqual(['POST /items']);
  expect(stock.map((held) => held.code)).toEqual([TUTORIAL_ITEM.code]);
  expect(texts(tree)).toContain('Procure pelo nome');
});

// Skips the tutorial once the test item exists and checks the test item is deleted and the tutorial closes; a replay
// from the user menu starts it again.
test('Mobile: skipping the Inventory tutorial deletes the test item, and it can be replayed', async () => {
  const stock: Item[] = [];
  const changes = answerApi(stock);
  const tree = await mount();
  for (let step = 0; step < 4; step += 1) {
    await press(tree, 'Fazer por mim');
    await wait(1000);
  }
  await press(tree, 'Pular tutorial');
  await wait(500);
  expect(changes).toEqual(['POST /items', 'DELETE /items/:id']);
  expect(stock).toEqual([]);
  expect(texts(tree)).not.toContain('Procure pelo nome');

  await ReactTestRenderer.act(async () => replay?.());
  await wait(500);
  expect(texts(tree)).toContain('Abra o cadastro');
});

// The replay of the tutorial, as the user menu asks for it.
let replay: (() => void) | undefined;

function Preferences({ children }: { children: React.ReactNode }) {
  const tutorial = useInventoryTutorialChoice();
  replay = tutorial.replay;
  return (
    <OpenItemOnRowContext.Provider value={useOpenItemOnRowChoice()}>
      <PageSizeContext.Provider value={usePageSizeChoice()}>
        <InventoryTutorialContext.Provider value={tutorial}>{children}</InventoryTutorialContext.Provider>
      </PageSizeContext.Provider>
    </OpenItemOnRowContext.Provider>
  );
}
