/**
 * @format
 */

import React from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { CATALOG_PATH, type CatalogData } from '@apc/domain/catalog';
import { CATALOG_TREE_NAMES } from '@apc/domain/catalog-tree-tutorial';
import { applyCatalogChange, catalogChangeOf, TEST_CATALOG_DATA } from '@apc/domain/test-catalog';
import { syncAnswer } from '@apc/domain/test-sync';
import type { TutorialId } from '@apc/domain/tutorials';
import { MOBILE_DESIGN_HEIGHT, MOBILE_DESIGN_WIDTH } from '@apc/ui-spec/screens';
import { CatalogTab } from './CatalogTab';
import { TutorialsContext, useTutorialsChoice } from '../dashboard/tutorialsContext';
import { themeStorage, ThemeProvider } from '../../app/theme';
import { ToastProvider } from '../../components/Toast';
import { TourProvider } from '../../components/Tour';
import { InventoryCopyProvider } from '../sync/useInventoryCopy';

// The Catalog tree tour on the phone, started as Tutoriais does: it opens the first brand's models, and on it adds a
// test model, a generation, a version, a period and an engine with its sheet, a second version, and moves the second
// version up, each change made on the catalog; the test model leaves the catalog, with its tree, when it ends or is
// skipped.

const { model, generation, firstVersion, secondVersion } = CATALOG_TREE_NAMES;
// A phone's screen with no notch, so the tour card has its insets.
const SAFE_AREA = { frame: { x: 0, y: 0, width: MOBILE_DESIGN_WIDTH, height: MOBILE_DESIGN_HEIGHT }, insets: { top: 0, right: 0, bottom: 0, left: 0 } };
// Trees the test rendered, unmounted after it so the timers don't outlive the test.
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
// The tutorials' start, as Tutoriais asks for one.
let start: ((id: TutorialId, onward?: boolean) => void) | undefined;

/**
 * Answers the API from a copy of the test catalog the changes change, under the API's rules: the change feed's full
 * copy with the catalog, an empty stock and lists, and each change to the catalog answering the whole catalog.
 * @returns The catalog as the API holds it now.
 */
function answerApi(): () => CatalogData {
  let data = JSON.parse(JSON.stringify(TEST_CATALOG_DATA)) as CatalogData;
  let made = 0;
  (fetch as jest.Mock).mockImplementation(async (url: string, init?: RequestInit) => {
    const { pathname, searchParams } = new URL(url);
    const method = init?.method ?? 'GET';
    const reply = (json: unknown, status = 200) => ({ ok: status < 400, status, json: () => Promise.resolve(json) });
    if (pathname === '/sync/changes') {
      return syncAnswer(searchParams, [], data);
    }
    if (pathname.startsWith(CATALOG_PATH) && method !== 'GET') {
      const id = `00000000-0000-4000-8000-0000000002${String(++made).padStart(2, '0')}`;
      const change = catalogChangeOf(method, pathname.slice(CATALOG_PATH.length), init?.body ? JSON.parse(String(init.body)) : {}, id);
      const result = change && applyCatalogChange(data, change.change);
      if (!change || typeof result === 'string' || !result) {
        return reply({ statusCode: 400, message: String(result) }, 400);
      }
      data = result;
      return reply(data, change.status);
    }
    if (pathname === CATALOG_PATH) {
      return reply(data);
    }
    if (pathname === '/items') {
      return reply({ items: [], total: 0 });
    }
    return reply([]);
  });
  return () => data;
}

/**
 * Finds the test model in the catalog the API holds.
 * @param data The catalog.
 * @returns Its generations' names, each with its versions' names, or null when it isn't there.
 */
function testModel(data: CatalogData): { name: string; versions: string[] }[] | null {
  const found = data.brands[0].models.find((each) => each.name === model);
  return found ? found.generations.map((each) => ({ name: each.name, versions: each.versions.map((version) => version.name) })) : null;
}

/**
 * Renders the Catalog tab with the tutorials' state, the toasts and the tour, and lets the catalog load.
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
                  <CatalogTab />
                </InventoryCopyProvider>
              </Tutorials>
            </TourProvider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(tree!);
  await wait(500);
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

// Starts "Montar a árvore de um modelo" and walks it with "Fazer por mim": it opens Chevrolet's models, and each step
// makes its change on the catalog and moves on, the card naming the tour and saying the phone's words, the test model
// showing among the models; the second version ends before the first, and Concluir takes the test model out.
test('Mobile: Montar a árvore de um modelo builds a test model on the catalog and moves a version', async () => {
  const catalog = answerApi();
  const tree = await mount();
  await ReactTestRenderer.act(async () => start?.('catalog-tree'));
  await wait(1000);
  expect(texts(tree)).toEqual(expect.arrayContaining(['Montar a árvore de um modelo', '1 / 8', 'Adicione um modelo', 'Chevette']));
  for (const [step, next] of [
    ['Adicione um modelo', 'Adicione uma geração'],
    ['Adicione uma geração', 'Adicione uma versão'],
    ['Adicione uma versão', 'Adicione um período'],
    ['Adicione um período', 'Adicione um motor'],
    ['Adicione um motor', 'Adicione outra versão'],
    ['Adicione outra versão', 'Mude a ordem'],
    ['Mude a ordem', 'Pronto!'],
  ]) {
    expect(texts(tree)).toContain(step);
    await press(tree, 'Fazer por mim');
    await wait(2000);
    expect(texts(tree)).toContain(next);
  }
  expect(texts(tree)).toContain(model);
  expect(testModel(catalog())).toEqual([{ name: generation, versions: [secondVersion, firstVersion] }]);
  await press(tree, 'Concluir');
  await wait(2000);
  expect(testModel(catalog())).toBeNull();
});

// Starts the tour, adds the test model and its generation with "Fazer por mim", then skips it, and checks the test
// model leaves the catalog.
test('Mobile: Montar a árvore de um modelo skipped takes the test model out of the catalog', async () => {
  const catalog = answerApi();
  const tree = await mount();
  await ReactTestRenderer.act(async () => start?.('catalog-tree'));
  await wait(1000);
  for (let step = 0; step < 2; step += 1) {
    await press(tree, 'Fazer por mim');
    await wait(2000);
  }
  expect(texts(tree)).toContain('Adicione uma versão');
  expect(testModel(catalog())).toEqual([{ name: generation, versions: [] }]);
  await press(tree, 'Pular tutorial');
  await wait(2000);
  expect(texts(tree)).not.toContain('Adicione uma versão');
  expect(testModel(catalog())).toBeNull();
});

function Tutorials({ children }: { children: React.ReactNode }) {
  // A user who has seen the Inventory tour, so it doesn't start by itself.
  const tutorials = useTutorialsChoice(true, () => {});
  start = tutorials.start;
  return <TutorialsContext.Provider value={tutorials}>{children}</TutorialsContext.Provider>;
}
