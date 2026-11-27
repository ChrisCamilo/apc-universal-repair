/**
 * @format
 */

import React from 'react';
import { Share, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { CSV_TEMPLATE_NAME } from '@apc/domain/item-csv';
import { matchesSearch, type Item, type ItemCreate } from '@apc/domain/items';
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

// The import tour on the phone, started as Tutoriais does: it opens Importar Peças from the "⋯" sheet, shares the
// template, reads the tour's sample file, imports its two test items and points at them; the test items leave the stock
// when the tour ends or is skipped.

// A phone's screen with no notch, so the tour card and the toast have their insets.
const SAFE_AREA = { frame: { x: 0, y: 0, width: MOBILE_DESIGN_WIDTH, height: MOBILE_DESIGN_HEIGHT }, insets: { top: 0, right: 0, bottom: 0, left: 0 } };
// Trees the test rendered, unmounted after it so the timers don't outlive the test.
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
// The tutorials' start, as Tutoriais asks for one.
let start: ((id: TutorialId, onward?: boolean) => void) | undefined;

/**
 * Answers the API as it would, keeping what is sent: the items, empty lists, an import and a delete.
 * @param stock The items in stock, changed as requests come.
 * @returns The requests that changed the stock, e.g. "POST /items/import TUTORIAL-CSV-1 TUTORIAL-CSV-2".
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
    if (pathname === '/items/import') {
      const sent = JSON.parse(String(init?.body)).items as ItemCreate[];
      changes.push(`POST /items/import ${sent.map((item) => item.brands[0].code).join(' ')}`);
      sent.forEach((item, index) =>
        stock.unshift({
          ...item,
          id: `00000000-0000-4000-8000-0000000000a${index}`,
          vehicles: item.vehicles.map((vehicle) => ({ ...vehicle, vehicleModel: vehicle.vehicleModel || null })),
          quantity: item.brands.reduce((sum, brand) => sum + (brand.quantity ?? 0), 0),
          brands: item.brands.map((brand) => ({ ...brand, id: `00000000-0000-4000-8000-0000000000b${index}`, location: brand.location || null, photos: [] })),
          createdAt: '2026-10-08T12:00:00.000Z',
          updatedAt: '2026-10-08T12:00:00.000Z',
        } as unknown as Item),
      );
      return reply({ created: sent.length, updated: 0 });
    }
    changes.push(`${method} ${pathname.replace(/[0-9a-f-]{36}$/, ':id')}`);
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
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// Starts "Importar um CSV" and walks it with "Fazer por mim" (Próximo on the steps that only show) but the template,
// shared by hand with Compartilhar modelo: Importar Peças opens, the template goes to the share sheet, the sample file
// is read, both rows ready, and imported, both test items then on the list; Concluir deletes them.
test('Mobile: Importar um CSV imports the sample file and shows its test items', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
  const stock: Item[] = [];
  const changes = answerApi(stock);
  const tree = await mount();
  await ReactTestRenderer.act(async () => start?.('inventory-import'));
  await wait(1000);
  expect(texts(tree)).toEqual(expect.arrayContaining(['Importar um CSV', '1 / 7', 'Abra Importar Peças', 'Toque no ⋯ do Estoque e em Importar Peças.']));
  await press(tree, 'Fazer por mim');
  await wait(1500);
  expect(texts(tree)).toContain('Pegue o modelo');
  await press(tree, 'Compartilhar modelo');
  await wait(1500);
  for (const [step, next] of [
    ['Escolha o arquivo', 'Confira antes'],
    ['Confira antes', 'Importe'],
    ['Importe', 'Na lista'],
    ['Na lista', 'Pronto!'],
  ]) {
    expect(texts(tree)).toContain(step);
    await press(tree, step === 'Confira antes' || step === 'Na lista' ? 'Próximo' : 'Fazer por mim');
    await wait(1500);
    expect(texts(tree)).toContain(next);
    if (next === 'Confira antes') {
      expect(texts(tree)).toEqual(expect.arrayContaining(['Item de teste do CSV 1', 'Item de teste do CSV 2', 'Importar 2 itens']));
    }
    if (next === 'Na lista') {
      expect(texts(tree)).toEqual(expect.arrayContaining(['Item de teste do CSV 1', 'TUTORIAL-CSV-1 · Bosch', 'Item de teste do CSV 2']));
    }
  }
  expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: CSV_TEMPLATE_NAME }));
  expect(changes).toEqual(['POST /items/import TUTORIAL-CSV-1 TUTORIAL-CSV-2']);
  await press(tree, 'Concluir');
  await wait(1000);
  expect(texts(tree)).not.toContain('Pronto!');
  expect(stock).toEqual([]);
  expect(changes).toEqual(['POST /items/import TUTORIAL-CSV-1 TUTORIAL-CSV-2', 'DELETE /items/:id', 'DELETE /items/:id']);
});

// Starts the tour, has the sample read with "Fazer por mim", then skips it, and checks Importar Peças closes and
// nothing was imported.
test('Mobile: Importar um CSV skipped imports nothing', async () => {
  jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
  const stock: Item[] = [];
  const changes = answerApi(stock);
  const tree = await mount();
  await ReactTestRenderer.act(async () => start?.('inventory-import'));
  await wait(1000);
  for (let step = 0; step < 3; step += 1) {
    await press(tree, 'Fazer por mim');
    await wait(1500);
  }
  expect(texts(tree)).toEqual(expect.arrayContaining(['Confira antes', 'Importar 2 itens']));
  await press(tree, 'Pular tutorial');
  await wait(1000);
  expect(texts(tree)).not.toContain('Importar 2 itens');
  expect(changes).toEqual([]);
});

function Tutorials({ children }: { children: React.ReactNode }) {
  // A user who has seen the Inventory tour, so it doesn't start by itself.
  const tutorials = useTutorialsChoice(true, () => {});
  start = tutorials.start;
  return <TutorialsContext.Provider value={tutorials}>{children}</TutorialsContext.Provider>;
}
