/**
 * @format
 */

import React from 'react';
import { Modal, Text, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { OPEN_ITEM_ON_ROW_STORAGE_KEY, type Item } from '@apc/shared/items';
import { THEME_STORAGE_KEYS, themes } from '@apc/shared/theme';
import { InventoryTab } from '../src/dashboard/InventoryTab';
import { OpenItemOnRowContext, useOpenItemOnRowChoice } from '../src/dashboard/openItemOnRowContext';
import { themeStorage, ThemeProvider } from '../src/theme';

const ITEMS: Item[] = [
  item(1, { code: 'W 712/95', name: 'Filtro de óleo', quantity: 8, minQuantity: 2 }),
  item(2, { code: 'BP-1020', name: 'Pastilha de freio', category: 'Freios', partBrand: 'Cobreq', position: 'D', quantity: 2, minQuantity: 3, unitPriceCents: 123456 }),
  item(3, { code: 'BA-77', name: "Bomba d'água", quantity: 0, minQuantity: 1 }),
];

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
    createdAt: '2026-10-03T12:00:00.000Z',
    updatedAt: '2026-10-03T12:00:00.000Z',
    ...fields,
  };
}

/**
 * Answers the items request with the test items and renders the Inventory tab once they load.
 * @returns The rendered tree.
 */
async function mount() {
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: ITEMS }) });
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: 'eighties', [THEME_STORAGE_KEYS.mode]: 'night' });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <Preferences>
          <InventoryTab />
        </Preferences>
      </ThemeProvider>,
    );
  });
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

beforeEach(async () => {
  await themeStorage.clear();
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

  const cards = tree.root.findAll((n) => n.props.testID === 'table-row' && typeof n.type === 'string');
  const { colors } = themes.eighties.night;
  expect(cards).toHaveLength(3);
  expect(cards[1].props.style.borderLeftColor).toBe(colors.warn);
  expect(cards[2].props.style.borderLeftColor).toBe(colors.danger);
});

// Searches by part code without separators and by name without accents, and for something that isn't there,
// checking the cards and the counter follow.
test('Mobile: the search finds items by name or part code', async () => {
  const tree = await mount();
  const search = () => tree.root.findByType(TextInput);
  const cards = () => tree.root.findAll((n) => n.props.testID === 'table-row' && typeof n.type === 'string');

  await ReactTestRenderer.act(async () => search().props.onChangeText('w712'));
  expect(cards()).toHaveLength(1);
  expect(texts(tree)).toContain('1 de 3 itens · 1 baixo · 1 esgotado');

  await ReactTestRenderer.act(async () => search().props.onChangeText('AGUA'));
  expect(texts(tree)).toContain("Bomba d'água");

  await ReactTestRenderer.act(async () => search().props.onChangeText('parafuso'));
  expect(texts(tree)).toContain('Nenhum item encontrado.');
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
  (fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(ITEMS[0]) })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: ITEMS }) });
  await ReactTestRenderer.act(async () => pressable('Salvar alterações').props.onPress());
  expect(fetch).toHaveBeenCalledTimes(2);
  expect((fetch as jest.Mock).mock.calls[1][0]).toMatch(/\/items$/);
  expect(dialog()).toBeUndefined();
});

// Presses a card's trash and checks the confirmation names the item and its code, then confirms and checks the item
// is deleted by its id, the list loads again without it and the confirmation closes.
test('Mobile: the trash asks to confirm, and a delete reloads the list', async () => {
  const tree = await mount();
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
  (fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, status: 204 })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: ITEMS.slice(0, 2) }) });
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
        n.props.testID === 'table-row' &&
        typeof n.props.onPress === 'function' &&
        n.findAll((c) => c.type === Text && c.props.children === code).length > 0,
    )[0];
  await ReactTestRenderer.act(async () => card('BP-1020').props.onPress());
  expect(texts(tree)).toContain('Detalhes do item');
  expect(tree.root.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === 'Código da peça')).toHaveLength(0);

  await themeStorage.setItem(OPEN_ITEM_ON_ROW_STORAGE_KEY, 'false');
  const off = await mount();
  expect(off.root.findAll((n) => n.props.testID === 'table-row' && typeof n.props.onPress === 'function')).toHaveLength(0);
});

function Preferences({ children }: { children: React.ReactNode }) {
  return <OpenItemOnRowContext.Provider value={useOpenItemOnRowChoice()}>{children}</OpenItemOnRowContext.Provider>;
}
