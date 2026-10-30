/**
 * @format
 */

import React from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import {
  matchesSearch,
  sortableOf,
  sortItems,
  stockStatus,
  type Item,
  type ItemSortKey,
} from '@apc/shared/items';
import { ITEM_LIST_PATHS, type ItemListKind } from '@apc/shared/lists';
import { MOBILE_DESIGN_HEIGHT, MOBILE_DESIGN_WIDTH } from '@apc/shared/screens';
import { itemListsOf } from '@apc/shared/test-lists';
import { THEME_STORAGE_KEYS, themes } from '@apc/shared/theme';
import { InventoryTab } from '../src/dashboard/InventoryTab';
import { InventoryTutorialContext, useInventoryTutorialChoice } from '../src/dashboard/inventoryTutorialContext';
import { themeStorage, ThemeProvider } from '../src/theme';
import { testItem, type FlatItem } from '@apc/shared/test-items';

// A photo the API saved, as items carry it.
const COVER = { id: '00000000-0000-4000-8000-0000000000aa', url: '/photos/aa.jpg', thumbUrl: '/photos/aa-thumb.webp' };
const ITEMS: Item[] = [
  item(1, { code: 'W 712/95', name: 'Filtro de óleo', quantity: 8, minQuantity: 2, photos: [COVER] }),
  item(2, { code: 'BP-1020', name: 'Pastilha de freio', category: 'Freios', partBrand: 'Cobreq', position: 'D', quantity: 2, minQuantity: 3, unitPriceCents: 123456 }),
  item(3, { code: 'BA-77', name: "Bomba d'água", quantity: 0, minQuantity: 1 }),
];
// Trees the test rendered, unmounted after it so a toast's hide timer doesn't outlive the test.
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
// A phone's screen with no notch, so the toasts have their insets.
const SAFE_AREA = { frame: { x: 0, y: 0, width: MOBILE_DESIGN_WIDTH, height: MOBILE_DESIGN_HEIGHT }, insets: { top: 0, right: 0, bottom: 0, left: 0 } };

/**
 * Fills in an item with the fields the list doesn't look at.
 * @param n Number of the item, which sets its id.
 * @param fields The fields that matter for the test.
 * @returns A complete item.
 */
function item(n: number, fields: FlatItem & Required<Pick<FlatItem, 'code' | 'name'>>): Item {
  return testItem({
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    category: 'Motor',
    partBrand: 'Mann',
    vehicleBrand: 'Volkswagen',
    vehicleModel: null,
    position: 'N/A',
    side: 'N/A',
    color: 'N/A',
    location: null,
    quantity: 1,
    minQuantity: 0,
    unitPriceCents: 3990,
    photos: [],
    createdAt: '2026-10-03T12:00:00.000Z',
    updatedAt: '2026-10-03T12:00:00.000Z',
    ...fields,
  });
}

/**
 * Answers every items request from a list of items, as the API would: narrowed by the search, the categories and the
 * stock status, sorted by a column when asked, one page at a time when a page size is asked, with how many match in all; and the item lists, with
 * what the items use at first. Requests a test answers itself, with mockResolvedValueOnce, come first.
 * @param stock The items in stock, newest first; read on every request.
 */
function answerItems(stock: Item[]) {
  const lists = itemListsOf(stock);
  (fetch as jest.Mock).mockImplementation(async (url: string) => {
    const { pathname, searchParams: query } = new URL(url);
    const list = (Object.keys(ITEM_LIST_PATHS) as ItemListKind[]).find((kind) => pathname === ITEM_LIST_PATHS[kind]);
    if (list) {
      return { ok: true, json: () => Promise.resolve(lists[list]) };
    }
    const categories = query.getAll('category');
    const status = query.get('status');
    const matching = stock.filter(
      (it) =>
        matchesSearch(it, query.get('q') ?? '') &&
        (categories.length === 0 || categories.includes(it.category)) &&
        (!status || stockStatus(it.quantity, it.minQuantity) === status),
    );
    const sort = query.get('sort') as ItemSortKey | null;
    const sorted = sort
      ? sortItems(
          matching.map((it) => ({ ...sortableOf(it), it })),
          { key: sort, dir: query.get('order') === 'desc' ? 'desc' : 'asc' },
        ).map((row) => row.it)
      : matching;
    const size = Number(query.get('pageSize')) || matching.length;
    const first = (Number(query.get('page') || 1) - 1) * size;
    return { ok: true, json: () => Promise.resolve({ items: sorted.slice(first, first + size), total: matching.length }) };
  });
}

/**
 * Answers the items requests from a list of items and renders the Inventory tab once they load.
 * @param stock The items in stock; the test items by default.
 * @returns The rendered tree.
 */
async function mount(stock: Item[] = ITEMS) {
  answerItems(stock);
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: 'eighties', [THEME_STORAGE_KEYS.mode]: 'night' });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>
          <Preferences>
            <InventoryTab />
          </Preferences>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(tree!);
  return tree!;
}

/**
 * Lists the texts on screen, joined, to check what shows.
 * @param tree Rendered tree.
 * @returns Every Text's content, one per entry.
 */
function texts(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root.findAll((n) => n.type === Text && typeof n.props.children !== 'object').map((n) => String(n.props.children));
}

afterEach(async () => {
  await ReactTestRenderer.act(async () => mounted.splice(0).forEach((tree) => tree.unmount()));
});

beforeEach(async () => {
  await themeStorage.clear();
  // The Inventory tutorial counts as seen, so it doesn't start by itself over what the test looks at.
});

// Loads the items from the API and checks every card shows its name, its code with its part brand and where it fits
// with its price, the counter of the total and the stock alerts, and the stock status chips with their counts. The
// low and out-of-stock cards are tinted, and each card's quantity has its status under it, in its tone: "un.",
// "Baixo", "Esgotado".
test('Mobile: the inventory lists every item with its stock alerts', async () => {
  const tree = await mount();
  expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/items$/), expect.anything());
  const shown = texts(tree);
  expect(shown).toContain('3 de 3 itens · 1 baixo · 1 esgotado');
  expect(shown).toEqual(expect.arrayContaining(['Pastilha de freio', 'BP-1020 · Cobreq', 'Baixo · 1', 'Esgotado · 1']));
  expect(shown.some((t) => t.replace(/\s/g, ' ') === 'Volkswagen · R$ 1.234,56')).toBe(true);

  const cards = tree.root.findAll((n) => n.props.testID === 'common.data-table.table.row' && typeof n.type === 'string');
  const { colors } = themes.eighties.night;
  expect(cards).toHaveLength(3);
  expect(StyleSheet.flatten(cards[1].props.style).borderLeftColor).toBe(colors.warn);
  expect(StyleSheet.flatten(cards[2].props.style).borderLeftColor).toBe(colors.danger);
  const tag = (card: ReactTestRenderer.ReactTestInstance) => {
    const node = card.find((n) => n.props.testID === 'inventory.inventory-tab.quantity.tag' && typeof n.type === 'string');
    return [node.props.children, StyleSheet.flatten(node.props.style).color];
  };
  expect(cards.map(tag)).toEqual([
    ['un.', colors.textMuted],
    ['Baixo', colors.warn],
    ['Esgotado', colors.danger],
  ]);
  const value = cards[2].find((n) => n.props.testID === 'inventory.inventory-tab.quantity.value' && typeof n.type === 'string');
  expect(StyleSheet.flatten(value.props.style)).toMatchObject({ fontSize: 20, color: colors.danger });
});

// Searches by part code without separators and by name without accents, and for something that isn't there,
// checking the cards and the counter follow.
test('Mobile: the search finds items by name or part code', async () => {
  const tree = await mount();
  const search = () => tree.root.findByType(TextInput);
  const cards = () => tree.root.findAll((n) => n.props.testID === 'common.data-table.table.row' && typeof n.type === 'string');

  await ReactTestRenderer.act(async () => search().props.onChangeText('w712'));
  expect(cards()).toHaveLength(1);
  expect(texts(tree)).toContain('1 de 3 itens · 1 baixo · 1 esgotado');

  await ReactTestRenderer.act(async () => search().props.onChangeText('AGUA'));
  expect(texts(tree)).toContain("Bomba d'água");

  await ReactTestRenderer.act(async () => search().props.onChangeText('parafuso'));
  expect(texts(tree)).toContain('Nenhum item encontrado');
});

// Presses "Novo item" and checks the empty form opens, then closes it and presses a card's pencil, and checks the form
// opens on that item; saving it with a quantity changed loads the list again.
test('Mobile: "Novo item" and the pencil open the item form, and a save reloads the list', async () => {
  const tree = await mount();
  const dialog = () => tree.root.findAllByType(Modal).find((modal) => modal.props.visible);
  const pressable = (name: string) =>
    tree.root.findAll(
      (n) =>
        typeof n.props.onPress === 'function' &&
        (n.props.accessibilityLabel === name || n.findAll((c) => c.type === Text && c.props.children === name).length > 0),
    )[0];
  expect(dialog()).toBeUndefined();
  await ReactTestRenderer.act(async () => pressable('Novo item').props.onPress());
  expect(texts(tree)).toContain('Novo item');
  expect(dialog()!.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === 'Código da peça')[0].props.value).toBe('');
  await ReactTestRenderer.act(async () => dialog()!.props.onRequestClose());

  await ReactTestRenderer.act(async () => pressable('Editar Filtro de óleo').props.onPress());
  expect(texts(tree)).toContain('Editar item');
  expect(dialog()!.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === 'Código da peça')[0].props.value).toBe('W 712/95');
  const quantity = dialog()!.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === 'Quantidade')[0];
  await ReactTestRenderer.act(async () => quantity.props.onChangeText('7'));
  (fetch as jest.Mock).mockClear();
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(ITEMS[0]) });
  await ReactTestRenderer.act(async () => pressable('Salvar alterações').props.onPress());
  expect((fetch as jest.Mock).mock.calls.map(([url]) => url.replace(/^.*\/items/, '/items'))).toEqual([
    `/items/${ITEMS[0].id}`,
    '/items',
    '/items?page=1&pageSize=25',
  ]);
  expect(dialog()).toBeUndefined();
});

// Presses a card's trash and checks the confirmation names the item and its code, then confirms and checks the item
// is deleted by its id, the list loads again without it and the confirmation closes.
test('Mobile: the trash asks to confirm, and a delete reloads the list', async () => {
  const stock = [...ITEMS];
  const tree = await mount(stock);
  const dialog = () => tree.root.findAllByType(Modal).find((modal) => modal.props.visible);
  const pressable = (name: string) =>
    tree.root.findAll(
      (n) =>
        typeof n.props.onPress === 'function' &&
        (n.props.accessibilityLabel === name || n.findAll((c) => c.type === Text && c.props.children === name).length > 0),
    )[0];
  await ReactTestRenderer.act(async () => pressable("Excluir Bomba d'água").props.onPress());
  expect(texts(tree)).toContain('Excluir item?');
  expect(texts(tree)).toContain("Bomba d'água (BA-77) sai do estoque. Essa ação não pode ser desfeita.");
  (fetch as jest.Mock).mockClear();
  (fetch as jest.Mock).mockImplementationOnce(async () => {
    stock.splice(2, 1);
    return { ok: true, status: 204 };
  });
  const confirm = dialog()!.findAll(
    (n) => typeof n.props.onPress === 'function' && n.findAll((c) => c.type === Text && c.props.children === 'Excluir').length > 0,
  )[0];
  await ReactTestRenderer.act(async () => confirm.props.onPress());
  expect(fetch).toHaveBeenNthCalledWith(1, expect.stringMatching(new RegExp(`/items/${ITEMS[2].id}$`)), { method: 'DELETE' });
  expect(dialog()).toBeUndefined();
  expect(texts(tree)).toContain('2 de 2 itens · 1 baixo · 0 esgotados');
});

// Taps the card of an item of one brand and checks the item's details open read-only, with no choice to turn it off.
test('Mobile: a card of one brand opens the item details', async () => {
  const tree = await mount();
  const card = (code: string) =>
    tree.root.findAll(
      (n) =>
        typeof n.type !== 'string' &&
        n.props.testID === 'common.data-table.table.row' &&
        typeof n.props.onPress === 'function' &&
        n.findAll((c) => c.type === Text && c.props.children === code).length > 0,
    )[0];
  await ReactTestRenderer.act(async () => card('BP-1020 · Cobreq').props.onPress());
  expect(texts(tree)).toContain('Detalhes do item');
  expect(tree.root.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === 'Código da peça')).toHaveLength(0);
  expect(card('BP-1020 · Cobreq').props.accessibilityState).toEqual({ expanded: undefined });
});

function Preferences({ children }: { children: React.ReactNode }) {
  return (
    <InventoryTutorialContext.Provider value={useInventoryTutorialChoice(true, () => {})}>{children}</InventoryTutorialContext.Provider>
  );
}

// Checks a card's thumbnail shows the item's cover from the API and opens its photos large; removing the photo there
// sends the set left, empty, to the item's brand, and the list loads again.
test('Mobile: the thumbnail opens the item photos, saved as they change', async () => {
  const tree = await mount();
  const thumbnail = tree.root.find(
    (n) => n.props.accessibilityLabel === 'Ver fotos de Filtro de óleo' && typeof n.props.onPress === 'function',
  );
  expect(thumbnail.findByType(Image).props.source.uri).toMatch(/\/photos\/aa-thumb\.webp$/);
  await ReactTestRenderer.act(async () => thumbnail.props.onPress());
  const pressable = (name: string) =>
    tree.root.findAll(
      (n) =>
        typeof n.props.onPress === 'function' &&
        (n.props.accessibilityLabel === name || n.findAll((c) => c.type === Text && c.props.children === name).length > 0),
    );
  await ReactTestRenderer.act(async () => pressable('Remover esta foto')[0].props.onPress());
  (fetch as jest.Mock).mockClear();
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ ...ITEMS[0], brands: [{ ...ITEMS[0].brands[0], photos: [] }] }) });
  const remove = pressable('Remover').filter((n) => typeof n.type !== 'string');
  await ReactTestRenderer.act(async () => remove[remove.length - 1].props.onPress());
  const [photosUrl, photosInit] = (fetch as jest.Mock).mock.calls[0];
  expect(photosUrl).toMatch(new RegExp(`/items/${ITEMS[0].id}/brands/${ITEMS[0].brands[0].id}/photos$`));
  expect(photosInit.method).toBe('PUT');
  expect(photosInit.body.getParts()).toEqual([]);
  expect((fetch as jest.Mock).mock.calls[1][0]).toMatch(/\/items$/);
  expect(texts(tree)).toContain('Foto removida');
});

// Picks a category in the Filtros menu and applies it, then turns on Esgotado, and checks each goes to the API as the
// list query and the cards follow; "Limpar filtros" brings every item back.
test('Mobile: the filters narrow the list through the API query', async () => {
  const tree = await mount();
  const pressable = (name: string) =>
    tree.root.find(
      (n) =>
        typeof n.type !== 'string' &&
        typeof n.props.onPress === 'function' &&
        n.props.accessibilityRole !== undefined &&
        (n.props.accessibilityLabel === name || n.findAll((c) => c.type === Text && c.props.children === name).length > 0),
    );
  const cards = () => tree.root.findAll((n) => n.props.testID === 'common.data-table.table.row' && typeof n.type === 'string');
  await ReactTestRenderer.act(async () => pressable('Filtros').props.onPress());
  await ReactTestRenderer.act(async () => pressable('Categoria').props.onPress());
  await ReactTestRenderer.act(async () => pressable('Freios').props.onPress());
  (fetch as jest.Mock).mockClear();
  await ReactTestRenderer.act(async () => pressable('Aplicar').props.onPress());
  expect((fetch as jest.Mock).mock.calls[0][0]).toMatch(/\/items\?category=Freios&page=1&pageSize=25$/);
  expect(cards()).toHaveLength(1);
  expect(texts(tree)).toContain('1 de 3 itens · 1 baixo · 1 esgotado');

  await ReactTestRenderer.act(async () => pressable('Esgotado · 1').props.onPress());
  expect((fetch as jest.Mock).mock.calls[1][0]).toMatch(/\/items\?category=Freios&status=out&page=1&pageSize=25$/);
  expect(texts(tree)).toContain('Nenhum item encontrado');

  // The link in the filter bar, ahead of the empty state's own "Limpar filtros".
  const clear = tree.root.findAll(
    (n) =>
      typeof n.type !== 'string' &&
      typeof n.props.onPress === 'function' &&
      n.props.accessibilityRole !== undefined &&
      n.findAll((c) => c.type === Text && c.props.children === 'Limpar filtros').length > 0,
  )[0];
  await ReactTestRenderer.act(async () => clear.props.onPress());
  expect(cards()).toHaveLength(3);
  expect(tree.root.findAll((n) => n.props.children === 'Limpar filtros')).toHaveLength(0);
});

// Holds the items request and checks the skeleton cards show with a loading announcement, then fails it and checks
// the error state, whose "Tentar de novo" loads the list once the API answers.
test('Mobile: the inventory shows loading, then the error state with a retry', async () => {
  // Every items request waits until the test fails them all.
  const pending: (() => void)[] = [];
  const fail = () => pending.splice(0).forEach((reject) => reject());
  (fetch as jest.Mock).mockImplementation(() => new Promise((_resolve, reject) => pending.push(() => reject(new Error('offline')))));
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>
          <Preferences>
            <InventoryTab />
          </Preferences>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(tree!);
  expect(tree!.root.findAll((n) => n.props.testID === 'inventory.inventory-tab.loading.row' && typeof n.type === 'string')).toHaveLength(5);
  expect(tree!.root.findAll((n) => n.props.accessibilityLabel === 'Carregando o estoque' && typeof n.type === 'string')).not.toHaveLength(0);

  await ReactTestRenderer.act(async () => fail());
  expect(texts(tree!)).toContain('Não foi possível carregar o estoque');
  answerItems(ITEMS);
  const retry = tree!.root.find(
    (n) => typeof n.props.onPress === 'function' && n.findAll((c) => c.type === Text && c.props.children === 'Tentar de novo').length > 0,
  );
  await ReactTestRenderer.act(async () => retry.props.onPress());
  expect(tree!.root.findAll((n) => n.props.testID === 'common.data-table.table.row' && typeof n.type === 'string')).toHaveLength(3);
});

// Searches for something that isn't there and checks the empty state offers "Limpar filtros", which clears the
// search; with nothing in stock, the empty state offers "Novo item", which opens the form.
test('Mobile: the empty states offer to clear the filters or add an item', async () => {
  const tree = await mount();
  const press = async (name: string) => {
    const node = tree.root.findAll(
      (n) => typeof n.props.onPress === 'function' && n.findAll((c) => c.type === Text && c.props.children === name).length > 0,
    );
    await ReactTestRenderer.act(async () => node[node.length - 1].props.onPress());
  };
  await ReactTestRenderer.act(async () => tree.root.findByType(TextInput).props.onChangeText('parafuso'));
  expect(texts(tree)).toContain('Nenhum item encontrado');
  await press('Limpar filtros');
  expect(tree.root.findByType(TextInput).props.value).toBe('');
  expect(tree.root.findAll((n) => n.props.testID === 'common.data-table.table.row' && typeof n.type === 'string')).toHaveLength(3);

  const empty = await mount([]);
  expect(texts(empty)).toContain('Nenhum item cadastrado');
  const add = empty.root.findAll(
    (n) => typeof n.props.onPress === 'function' && n.findAll((c) => c.type === Text && c.props.children === 'Novo item').length > 0,
  );
  await ReactTestRenderer.act(async () => add[add.length - 1].props.onPress());
  expect(empty.root.findAllByType(Modal).some((modal) => modal.props.visible)).toBe(true);
});

// Opens the Inventory with items and with none, and checks each time the tab sits on the canvas with no panel around
// it, filling the screen, and scrolls as a whole with no pagination; with every item in, the list ends with "Fim da
// lista", and with none it doesn't. (The loading and error states are checked in their own test.)
test('Mobile: the tab scrolls as a whole, with no pagination', async () => {
  const listed = await mount();
  expect(listed.root.findAll((n) => n.props.testID === 'common.panel')).toHaveLength(0);
  const tab = listed.root.find((n) => n.props.testID === 'inventory.inventory-tab' && typeof n.type === 'string');
  expect(StyleSheet.flatten(tab.props.style).flex).toBe(1);
  expect(listed.root.findAll((n) => n.props.accessibilityLabel === 'Páginas do estoque')).toHaveLength(0);
  expect(texts(listed)).toContain('Fim da lista');

  const empty = await mount([]);
  expect(texts(empty)).toContain('Nenhum item cadastrado');
  expect(texts(empty)).not.toContain('Fim da lista');
});

// Checks "Novo item" is a round 56px "+" at the bottom right of the tab, in the accent, over the scrolling column,
// which ends clear of it, and that it opens the empty form.
test('Mobile: the round + at the bottom right opens a new item', async () => {
  const tree = await mount();
  const fab = tree.root.find((n) => n.props.testID === 'inventory.inventory-tab.new-item' && typeof n.type === 'string');
  expect(StyleSheet.flatten(fab.props.style)).toMatchObject({ position: 'absolute', right: 16, bottom: 16 });
  const button = tree.root.find((n) => typeof n.type !== 'string' && n.props.accessibilityLabel === 'Novo item' && typeof n.props.onPress === 'function');
  expect(StyleSheet.flatten(button.props.style({ pressed: false }))).toMatchObject({
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: themes.eighties.night.colors.accent,
  });
  const scroll = tree.root.find((n) => n.props.testID === 'inventory.inventory-tab.scroll' && n.type === ScrollView);
  expect(StyleSheet.flatten(scroll.props.contentContainerStyle).paddingBottom).toBeGreaterThanOrEqual(56 + 16);
  await ReactTestRenderer.act(async () => button.props.onPress());
  expect(texts(tree)).toContain('Novo item');
  expect(tree.root.findAllByType(Modal).some((modal) => modal.props.visible)).toBe(true);
});

// Lists 30 items and checks the first 25 show. Scrolling far from the end asks for nothing; within a screen of it, the
// API is asked for the next 25, skeleton cards showing until they come, then the other 5 join the list and "Fim da
// lista" ends it, and scrolling on asks for nothing more. A search starts over from the first 25.
test('Mobile: the list loads the next items as it scrolls near its end', async () => {
  const stock = Array.from({ length: 30 }, (_, index) =>
    item(index + 10, { code: `P-${String(index + 1).padStart(3, '0')}`, name: `Peça ${index + 1}`, quantity: 5 }),
  );
  const tree = await mount(stock);
  const cards = () => tree.root.findAll((n) => n.props.testID === 'common.data-table.table.row' && typeof n.type === 'string');
  const skeletons = () => tree.root.findAll((n) => n.props.testID === 'inventory.inventory-tab.loading.row' && typeof n.type === 'string');
  const scroll = () => tree.root.find((n) => n.props.testID === 'inventory.inventory-tab.scroll' && n.type === ScrollView);
  // The list as a 600px screen sees it, 3000px tall, scrolled to y.
  const scrollTo = (y: number) =>
    ReactTestRenderer.act(async () =>
      scroll().props.onScroll({
        nativeEvent: { contentOffset: { x: 0, y }, layoutMeasurement: { width: 360, height: 600 }, contentSize: { width: 360, height: 3000 } },
      }),
    );
  expect(cards()).toHaveLength(25);
  expect((fetch as jest.Mock).mock.calls.some(([url]) => /\/items\?page=1&pageSize=25$/.test(url))).toBe(true);
  expect(texts(tree)).not.toContain('Fim da lista');

  const fetchMock = fetch as jest.Mock;
  fetchMock.mockClear();
  await scrollTo(1000);
  expect(fetchMock).not.toHaveBeenCalled();

  const answer = fetchMock.getMockImplementation()!;
  let release = () => {};
  fetchMock.mockImplementationOnce((url: string) => new Promise((resolve) => (release = () => resolve(answer(url)))));
  await scrollTo(1900);
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/items\?page=2&pageSize=25$/);
  expect(skeletons()).toHaveLength(5);
  await ReactTestRenderer.act(async () => release());
  expect(cards()).toHaveLength(30);
  expect(skeletons()).toHaveLength(0);
  expect(texts(tree)).toContain('Fim da lista');

  fetchMock.mockClear();
  await scrollTo(2400);
  expect(fetchMock).not.toHaveBeenCalled();

  await ReactTestRenderer.act(async () => tree.root.findByType(TextInput).props.onChangeText('Peça 3'));
  expect(fetchMock.mock.calls.at(-1)[0]).toMatch(/\/items\?q=Pe%C3%A7a\+3&page=1&pageSize=25$/);
});

// Sorts by unit price with the "Ordenar" select and checks the sort goes to the API, the list starts over from its
// first items and the cards follow the price, highest first, ties in part code order.
test('Mobile: the "Ordenar" select sorts the list through the API', async () => {
  const stock = Array.from({ length: 30 }, (_, index) =>
    item(index + 10, { code: `P-${index + 1}`, name: `Peça ${index + 1}`, unitPriceCents: ((index % 7) + 1) * 100 }),
  );
  const tree = await mount(stock);
  const press = async (name: string) => {
    const node = tree.root.findAll(
      (n) =>
        typeof n.props.onPress === 'function' &&
        (n.props.accessibilityLabel === name || n.findAll((c) => c.type === Text && c.props.children === name).length > 0),
    )[0];
    await ReactTestRenderer.act(async () => node.props.onPress());
  };
  (fetch as jest.Mock).mockClear();
  await press('Ordenar');
  expect(texts(tree)).toEqual(expect.arrayContaining(['Veículo (A → Z)', 'Local (Z → A)', 'Quantidade (maior → menor)']));
  await press('Valor unitário (maior → menor)');
  expect((fetch as jest.Mock).mock.calls.at(-1)[0]).toMatch(/\/items\?page=1&pageSize=25&sort=price&order=desc$/);
  const names = texts(tree).filter((text) => /^Peça \d+$/.test(text));
  expect(names.slice(0, 3)).toEqual(['Peça 7', 'Peça 14', 'Peça 21']);
});

// Lists an item of two brands and checks its card shows its first code with "2 marcas", the quantity added up with
// its stock status, and no chevron; a tap on it opens the item's details, not a card for each brand.
test('Mobile: an item of several brands opens its details', async () => {
  const pads = item(4, {
    name: 'Pastilha dianteira',
    code: 'N-1210',
    quantity: 3,
    minQuantity: 4,
    brands: [
      { ...item(5, { code: 'N-1210', name: '' }).brands[0], partBrand: 'Cobreq', quantity: 1 },
      { ...item(6, { code: 'PD/1210', name: '' }).brands[0], partBrand: 'Fras-le', quantity: 2 },
    ],
  });
  const tree = await mount([pads]);
  const cards = () => tree.root.findAll((n) => n.props.testID === 'common.data-table.table.row' && typeof n.type === 'string');
  const card = tree.root.findAll((n) => n.props.testID === 'common.data-table.table.row' && typeof n.props.onPress === 'function')[0];
  expect(cards()).toHaveLength(1);
  expect(texts(tree)).toEqual(expect.arrayContaining(['N-1210 · 2 marcas', '3', 'Baixo']));
  expect(tree.root.findAll((n) => n.props.testID === 'inventory.inventory-tab.chevron')).toHaveLength(0);
  expect(card.props.accessibilityState).toEqual({ expanded: undefined });

  await ReactTestRenderer.act(async () => card.props.onPress());
  expect(texts(tree)).toContain('Detalhes do item');
  expect(cards()).toHaveLength(1);
});
