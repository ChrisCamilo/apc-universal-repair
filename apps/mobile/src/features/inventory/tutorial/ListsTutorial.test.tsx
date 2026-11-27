/**
 * @format
 */

import React from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { matchesSearch } from '@apc/domain/items';
import { LISTS_TUTORIAL_NAMES } from '@apc/domain/lists-tutorial';
import { syncPageOf } from '@apc/domain/test-sync';
import type { TutorialId } from '@apc/domain/tutorials';
import { MOBILE_DESIGN_HEIGHT, MOBILE_DESIGN_WIDTH } from '@apc/ui-spec/screens';
import { InventoryTab } from '../InventoryTab';
import { TutorialsContext, useTutorialsChoice } from '../../dashboard/tutorialsContext';
import { themeStorage, ThemeProvider } from '../../../app/theme';
import { ToastProvider } from '../../../components/Toast';
import { TourProvider } from '../../../components/Tour';
import { InventoryCopyProvider } from '../../sync/useInventoryCopy';

// The lists tour on the phone, started as Tutoriais does: on the two test categories it adds on the server, it opens
// Gerenciar listas, renames the first, joins it into the second and deletes the one left; skipped, it deletes the test
// categories left, and no other category is touched.

const { first, second, renamed } = LISTS_TUTORIAL_NAMES;
// A phone's screen with no notch, so the tour card and the toast have their insets.
const SAFE_AREA = { frame: { x: 0, y: 0, width: MOBILE_DESIGN_WIDTH, height: MOBILE_DESIGN_HEIGHT }, insets: { top: 0, right: 0, bottom: 0, left: 0 } };
// Trees the test rendered, unmounted after it so the timers don't outlive the test.
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
// The tutorials' start, as Tutoriais asks for one.
let start: ((id: TutorialId, onward?: boolean) => void) | undefined;

/**
 * Answers the API as it would, keeping the categories it is sent: the change feed's full copy, with the categories, an
 * empty stock, and a category added, renamed, joined into another and deleted.
 * @param categories The categories, changed as requests come.
 * @returns The requests that changed them, e.g. "POST /categories Categoria de teste 1".
 */
function answerApi(categories: { id: string; name: string }[]): string[] {
  const changes: string[] = [];
  let made = 0;
  (fetch as jest.Mock).mockImplementation(async (url: string, init?: RequestInit) => {
    const { pathname, searchParams } = new URL(url);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const reply = (json: unknown, status = 200) => ({ ok: true, status, json: () => Promise.resolve(json) });
    const at = categories.findIndex((entry) => pathname.startsWith(`/categories/${entry.id}`));
    if (pathname === '/sync/changes') {
      if (searchParams.has('since')) {
        return Response.json({ statusCode: 410, error: 'Gone', message: 'Make a full copy.', reason: 'cursorGone' }, { status: 410 });
      }
      const page = syncPageOf([]);
      const rows = categories.map((entry, index) => ({ kind: 'category', id: entry.id, row: entry, version: page.changes.length + index + 1 }));
      return Response.json({ ...page, changes: [...page.changes, ...rows] });
    }
    if (pathname === '/categories' && method === 'POST') {
      changes.push(`POST /categories ${body.name}`);
      const entry = { id: `00000000-0000-4000-8000-0000000001${String(++made).padStart(2, '0')}`, name: body.name };
      categories.push(entry);
      return reply(entry, 201);
    }
    if (at >= 0 && pathname.endsWith('/merge')) {
      changes.push(`merge ${categories[at].name} → ${categories.find((entry) => entry.id === body.into)?.name}`);
      categories.splice(at, 1);
      return reply({ moved: 0 });
    }
    if (at >= 0 && method === 'PATCH') {
      changes.push(`rename ${categories[at].name} → ${body.name}`);
      categories[at] = { ...categories[at], name: body.name };
      return reply(categories[at]);
    }
    if (at >= 0 && method === 'DELETE') {
      changes.push(`DELETE ${categories[at].name}`);
      categories.splice(at, 1);
      return reply(null, 204);
    }
    if (method === 'GET' && pathname === '/items') {
      return reply({ items: [].filter((held) => matchesSearch(held, '')), total: 0 });
    }
    return reply([]);
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

// Starts "Renomear e juntar nomes das listas" and walks it with "Fazer por mim": it adds the two test categories, opens
// Gerenciar listas, where they show, renames the first, joins it into the second and deletes it, each change on the
// server; Concluir leaves only the category there before.
test('Mobile: Renomear e juntar nomes das listas renames, joins and deletes the test categories', async () => {
  const categories = [{ id: '00000000-0000-4000-8000-000000000001', name: 'Motor' }];
  const changes = answerApi(categories);
  const tree = await mount();
  await ReactTestRenderer.act(async () => start?.('inventory-lists'));
  await wait(1500);
  expect(texts(tree)).toEqual(expect.arrayContaining(['Renomear e juntar nomes das listas', '1 / 7', 'Abra Gerenciar listas']));
  expect(changes).toEqual([`POST /categories ${first}`, `POST /categories ${second}`]);
  for (const [step, next] of [
    ['Abra Gerenciar listas', 'Renomeie'],
    ['Renomeie', 'Junte com outra'],
    ['Junte com outra', 'Exclua'],
    ['Exclua', 'Pronto!'],
  ]) {
    expect(texts(tree)).toContain(step);
    if (step === 'Renomeie') {
      expect(texts(tree)).toEqual(expect.arrayContaining([first, second]));
    }
    await press(tree, 'Fazer por mim');
    await wait(3000);
    expect(texts(tree)).toContain(next);
  }
  expect(changes.slice(2)).toEqual([`rename ${first} → ${renamed}`, `merge ${renamed} → ${second}`, `DELETE ${second}`]);
  expect(texts(tree)).not.toContain(second);
  await press(tree, 'Concluir');
  await wait(1000);
  expect(categories).toEqual([{ id: '00000000-0000-4000-8000-000000000001', name: 'Motor' }]);
});

// Starts the tour, renames the first test category with "Fazer por mim", then skips it, and checks both test categories
// left are deleted and the other one kept.
test('Mobile: Renomear e juntar nomes das listas skipped deletes the test categories', async () => {
  const categories = [{ id: '00000000-0000-4000-8000-000000000001', name: 'Motor' }];
  const changes = answerApi(categories);
  const tree = await mount();
  await ReactTestRenderer.act(async () => start?.('inventory-lists'));
  await wait(1500);
  for (let step = 0; step < 2; step += 1) {
    await press(tree, 'Fazer por mim');
    await wait(3000);
  }
  expect(texts(tree)).toContain('Junte com outra');
  await press(tree, 'Pular tutorial');
  await wait(1500);
  expect(texts(tree)).not.toContain('Junte com outra');
  expect(changes.slice(-2).sort()).toEqual([`DELETE ${second}`, `DELETE ${renamed}`]);
  expect(categories).toEqual([{ id: '00000000-0000-4000-8000-000000000001', name: 'Motor' }]);
});

function Tutorials({ children }: { children: React.ReactNode }) {
  // A user who has seen the Inventory tour, so it doesn't start by itself.
  const tutorials = useTutorialsChoice(true, () => {});
  start = tutorials.start;
  return <TutorialsContext.Provider value={tutorials}>{children}</TutorialsContext.Provider>;
}
