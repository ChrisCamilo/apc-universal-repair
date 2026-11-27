/**
 * @format
 */

import React from 'react';
import { NativeModules, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { matchesSearch, type Item } from '@apc/domain/items';
import { ITEM_LIST_PATHS } from '@apc/domain/lists';
import { syncAnswer } from '@apc/domain/test-sync';
import type { TutorialId } from '@apc/domain/tutorials';
import { MOBILE_DESIGN_HEIGHT, MOBILE_DESIGN_WIDTH } from '@apc/ui-spec/screens';
import { InventoryTab } from '../InventoryTab';
import { TutorialsContext, useTutorialsChoice } from '../../dashboard/tutorialsContext';
import { themeStorage, ThemeProvider } from '../../../app/theme';
import { ToastProvider } from '../../../components/Toast';
import { TourProvider } from '../../../components/Tour';
import { InventoryCopyProvider } from '../../sync/useInventoryCopy';

// The photos tour on the phone, started as Tutoriais does: on the test item it makes, it opens the details, unlocks the
// edit, adds the two sample photos, takes out the first and saves the second, which the phone queues and sends; the test
// item leaves the stock when the tour ends or is skipped.

// A phone's screen with no notch, so the tour card and the toast have their insets.
const SAFE_AREA = { frame: { x: 0, y: 0, width: MOBILE_DESIGN_WIDTH, height: MOBILE_DESIGN_HEIGHT }, insets: { top: 0, right: 0, bottom: 0, left: 0 } };
// Trees the test rendered, unmounted after it so the timers don't outlive the test.
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
// The tutorials' start, as Tutoriais asks for one.
let start: ((id: TutorialId, onward?: boolean) => void) | undefined;

/**
 * Answers the API as it would, keeping what is sent: the items, empty lists, a new item, a brand's photos and a delete.
 * @param stock The items in stock, changed as requests come.
 * @returns The requests that changed the stock, e.g. "POST /items", a photo save with the files it sent, e.g.
 * "PUT photos tutorial-photo-2.jpg".
 */
function answerApi(stock: Item[]): string[] {
  const changes: string[] = [];
  (fetch as jest.Mock).mockImplementation(async (url: string, init?: RequestInit) => {
    const { pathname, searchParams } = new URL(url);
    const method = init?.method ?? 'GET';
    const reply = (body: unknown, status = 200) => ({ ok: true, status, json: () => Promise.resolve(body) });
    if (pathname === '/sync/changes') {
      return syncAnswer(searchParams, stock);
    }
    if (Object.values(ITEM_LIST_PATHS).includes(pathname)) {
      return reply([]);
    }
    if (method === 'GET') {
      const matching = stock.filter((held) => matchesSearch(held, searchParams.get('q') ?? ''));
      return reply({ items: matching, total: matching.length });
    }
    if (pathname.endsWith('/photos')) {
      // React Native's FormData keeps its parts as [name, value] pairs.
      const parts = (init?.body as unknown as { _parts: [string, { name?: string; uri?: string } | string][] })._parts;
      changes.push(`PUT photos ${parts.map(([, value]) => (typeof value === 'string' ? value : `${value.name} ${value.uri}`)).join(', ')}`);
      const item = stock[0];
      const photos = parts.map((_, index) => ({ id: `00000000-0000-4000-8000-00000000010${index}`, url: `/photos/p${index}.webp`, thumbUrl: `/photos/p${index}-thumb.webp` }));
      stock[0] = { ...item, brands: [{ ...item.brands[0], photos }] };
      return reply(stock[0]);
    }
    changes.push(`${method} ${pathname.replace(/[0-9a-f-]{36}$/, ':id')}`);
    if (method === 'POST') {
      const sent = JSON.parse(String(init?.body));
      const saved = {
        ...sent,
        id: '00000000-0000-4000-8000-0000000000aa',
        quantity: sent.brands.reduce((sum: number, brand: { quantity: number }) => sum + brand.quantity, 0),
        brands: sent.brands.map((brand: { location?: string }) => ({ ...brand, id: '00000000-0000-4000-8000-0000000000ab', location: brand.location || null, photos: [] })),
        createdAt: '2026-10-08T12:00:00.000Z',
        updatedAt: '2026-10-08T12:00:00.000Z',
      };
      stock.unshift(saved);
      return reply(saved, 201);
    }
    stock.splice(0, stock.length, ...stock.filter((held) => !pathname.endsWith(held.id)));
    return reply(null, 204);
  });
  return changes;
}

/**
 * Renders the Inventory tab with the tutorials' state, the toasts and the tour, and lets the items load.
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
              <Tutorials>
                <InventoryCopyProvider>
                  <InventoryTab />
                </InventoryCopyProvider>
              </Tutorials>
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
 * Counts the photos the form's photo field shows, by their × buttons.
 * @param tree Rendered tree.
 * @returns How many.
 */
function photosShown(tree: ReactTestRenderer.ReactTestRenderer): number {
  return tree.root.findAll((n) => typeof n.type !== 'string' && typeof n.props.accessibilityLabel === 'string' && /^Remover foto \d$/.test(n.props.accessibilityLabel) && n.props.onPress).length;
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

// Starts "Fotos de uma marca" and walks it with "Fazer por mim": it makes the test item, opens its details and the
// edit, adds the two sample photos, takes out the first, and saves, the phone sending the second sample alone, from the
// app's resources; the card names the tour and says the phone's words. Concluir deletes the test item.
test('Mobile: Fotos de uma marca adds the sample photos, keeps the second and saves it', async () => {
  const stock: Item[] = [];
  const changes = answerApi(stock);
  const tree = await mount();
  await ReactTestRenderer.act(async () => start?.('inventory-photos'));
  await wait(1000);
  expect(texts(tree)).toEqual(expect.arrayContaining(['Fotos de uma marca', '1 / 6', 'Abra o item de teste', 'Toque no item de teste para ver os detalhes dele.']));
  expect(changes).toEqual(['POST /items']);
  for (const [step, next] of [
    ['Abra o item de teste', 'Libere a edição'],
    ['Libere a edição', 'Adicione duas fotos'],
    ['Adicione duas fotos', 'Tire a primeira'],
    ['Tire a primeira', 'Salve as fotos'],
    ['Salve as fotos', 'Pronto!'],
  ]) {
    expect(texts(tree)).toContain(step);
    await press(tree, 'Fazer por mim');
    await wait(1500);
    expect(texts(tree)).toContain(next);
    if (next === 'Tire a primeira') {
      expect(photosShown(tree)).toBe(2);
    }
    if (next === 'Salve as fotos') {
      expect(photosShown(tree)).toBe(1);
    }
  }
  expect(changes).toEqual(['POST /items', expect.stringMatching(/^PUT photos tutorial-photo-2\.jpg file:\/\/\/held\/\S+$/)]);
  expect(NativeModules.PhotoCache.hold).toHaveBeenCalledWith(expect.any(String), 'android.resource://com.apc.universalrepair/raw/tutorial_photo_2');
  expect(NativeModules.PhotoCache.hold).not.toHaveBeenCalledWith(expect.any(String), 'android.resource://com.apc.universalrepair/raw/tutorial_photo_1');
  expect(stock[0].brands[0].photos).toHaveLength(1);
  await press(tree, 'Concluir');
  await wait(1000);
  expect(texts(tree)).not.toContain('Pronto!');
  expect(stock).toEqual([]);
});

// Starts the tour, adds the sample photos with "Fazer por mim", then skips it, and checks the form closes and the test
// item is deleted, its photos never sent.
test('Mobile: Fotos de uma marca skipped deletes the test item', async () => {
  const stock: Item[] = [];
  const changes = answerApi(stock);
  const tree = await mount();
  await ReactTestRenderer.act(async () => start?.('inventory-photos'));
  await wait(1000);
  for (let step = 0; step < 3; step += 1) {
    await press(tree, 'Fazer por mim');
    await wait(1500);
  }
  expect(texts(tree)).toContain('Tire a primeira');
  await press(tree, 'Pular tutorial');
  await wait(1000);
  expect(texts(tree)).not.toContain('Tire a primeira');
  expect(photosShown(tree)).toBe(0);
  expect(stock).toEqual([]);
  expect(changes).toEqual(['POST /items', 'DELETE /items/:id']);
});

function Tutorials({ children }: { children: React.ReactNode }) {
  // A user who has seen the Inventory tour, so it doesn't start by itself.
  const tutorials = useTutorialsChoice(true, () => {});
  start = tutorials.start;
  return <TutorialsContext.Provider value={tutorials}>{children}</TutorialsContext.Provider>;
}
