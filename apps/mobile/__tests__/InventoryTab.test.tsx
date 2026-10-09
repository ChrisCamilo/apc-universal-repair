/**
 * @format
 */

import React from 'react';
import { Image, Modal, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { INVENTORY_TUTORIAL_STORAGE_KEY } from '@apc/shared/inventory-tutorial';
import {
  matchesSearch,
  OPEN_ITEM_ON_ROW_STORAGE_KEY,
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
import { OpenItemOnRowContext, useOpenItemOnRowChoice } from '../src/dashboard/openItemOnRowContext';
import { PageSizeContext, usePageSizeChoice } from '../src/dashboard/pageSizeContext';
import { themeStorage, ThemeProvider } from '../src/theme';

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
function item(n: number, fields: Partial<Item> & Pick<Item, 'code' | 'name'>): Item {
  return {
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
  };
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
    const sorted = sort ? sortItems(matching, { key: sort, dir: query.get('order') === 'desc' ? 'desc' : 'asc' }) : matching;
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
  await themeStorage.setItem(INVENTORY_TUTORIAL_STORAGE_KEY, 'true');
});

// Loads the items from the API and checks every card shows with its details, the counter of the total and
// the stock alerts, and the low and out-of-stock cards tinted.
test('Mobile: the inventory lists every item with its stock alerts', async () => {
  const tree = await mount();
  expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/items$/), expect.anything());
  const shown = texts(tree);
  expect(shown).toContain('3 de 3 itens · 1 baixo · 1 esgotado');
  expect(shown).toContain('Pastilha de freio');
  expect(shown.some((t) => t.replace(/\s/g, ' ').startsWith('Freios · Cobreq · Volkswagen · D · R$ 1.234,56'))).toBe(true);

  const cards = tree.root.findAll((n) => n.props.testID === 'common.data-table.table.row' && typeof n.type === 'string');
  const { colors } = themes.eighties.night;
  expect(cards).toHaveLength(3);
  expect(StyleSheet.flatten(cards[1].props.style).borderLeftColor).toBe(colors.warn);
  expect(StyleSheet.flatten(cards[2].props.style).borderLeftColor).toBe(colors.danger);
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
// opens on that item; saving it loads the list again.
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

// Taps a card and checks the item's details open read-only; then, with "Abrir item ao clicar na linha" saved off,
// checks the cards don't open.
test('Mobile: a card opens the item details while the option is on', async () => {
  const tree = await mount();
  const card = (code: string) =>
    tree.root.findAll(
      (n) =>
        typeof n.type !== 'string' &&
        n.props.testID === 'common.data-table.table.row' &&
        typeof n.props.onPress === 'function' &&
        n.findAll((c) => c.type === Text && c.props.children === code).length > 0,
    )[0];
  await ReactTestRenderer.act(async () => card('BP-1020').props.onPress());
  expect(texts(tree)).toContain('Detalhes do item');
  expect(tree.root.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === 'Código da peça')).toHaveLength(0);

  await themeStorage.setItem(OPEN_ITEM_ON_ROW_STORAGE_KEY, 'false');
  const off = await mount();
  expect(off.root.findAll((n) => n.props.testID === 'common.data-table.table.row' && typeof n.props.onPress === 'function')).toHaveLength(0);
});

function Preferences({ children }: { children: React.ReactNode }) {
  return (
    <OpenItemOnRowContext.Provider value={useOpenItemOnRowChoice()}>
      <PageSizeContext.Provider value={usePageSizeChoice()}>
        <InventoryTutorialContext.Provider value={useInventoryTutorialChoice()}>{children}</InventoryTutorialContext.Provider>
      </PageSizeContext.Provider>
    </OpenItemOnRowContext.Provider>
  );
}

// Checks a card's thumbnail shows the item's cover from the API and opens its photos large; removing the photo there
// sends the set left, empty, and the list loads again.
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
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ ...ITEMS[0], photos: [] }) });
  const remove = pressable('Remover').filter((n) => typeof n.type !== 'string');
  await ReactTestRenderer.act(async () => remove[remove.length - 1].props.onPress());
  const [photosUrl, photosInit] = (fetch as jest.Mock).mock.calls[0];
  expect(photosUrl).toMatch(new RegExp(`/items/${ITEMS[0].id}/photos$`));
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

  await ReactTestRenderer.act(async () => pressable('Esgotado').props.onPress());
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
  expect(tree!.root.findAll((n) => n.props.testID === 'loading-row' && typeof n.type === 'string')).toHaveLength(5);
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

// Lists 30 items and checks the first page shows 25 with the pagination asking the API for page 1, the second page
// asks for page 2 and shows the other 5, and a search goes back to page 1.
test('Mobile: the inventory list shows one page at a time', async () => {
  const stock = Array.from({ length: 30 }, (_, index) =>
    item(index + 10, { code: `P-${String(index + 1).padStart(3, '0')}`, name: `Peça ${index + 1}`, quantity: 5 }),
  );
  const tree = await mount(stock);
  const cards = () => tree.root.findAll((n) => n.props.testID === 'common.data-table.table.row' && typeof n.type === 'string');
  expect(cards()).toHaveLength(25);
  expect(texts(tree)).toContain('1–25 de 30');
  const pageTwo = tree.root.find((n) => n.props.accessibilityLabel === 'Página 2' && typeof n.props.onPress === 'function');
  (fetch as jest.Mock).mockClear();
  await ReactTestRenderer.act(async () => pageTwo.props.onPress());
  expect((fetch as jest.Mock).mock.calls.at(-1)[0]).toMatch(/\/items\?page=2&pageSize=25$/);
  expect(cards()).toHaveLength(5);
  expect(texts(tree)).toContain('26–30 de 30');

  await ReactTestRenderer.act(async () => tree.root.findByType(TextInput).props.onChangeText('Peça 3'));
  expect((fetch as jest.Mock).mock.calls.at(-1)[0]).toMatch(/\/items\?q=Pe%C3%A7a\+3&page=1&pageSize=25$/);
});

// On the second page, sorts by unit price with the "Ordenar" select and checks the sort goes to the API, the list goes
// back to the first page and the cards follow the price, highest first, ties in part code order.
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
  await press('Página 2');
  (fetch as jest.Mock).mockClear();
  await press('Ordenar');
  expect(texts(tree)).toEqual(expect.arrayContaining(['Veículo (A → Z)', 'Local (Z → A)', 'Quantidade (maior → menor)']));
  await press('Valor unitário (maior → menor)');
  expect((fetch as jest.Mock).mock.calls.at(-1)[0]).toMatch(/\/items\?page=1&pageSize=25&sort=price&order=desc$/);
  const names = texts(tree).filter((text) => /^Peça \d+$/.test(text));
  expect(names.slice(0, 3)).toEqual(['Peça 7', 'Peça 14', 'Peça 21']);
});
