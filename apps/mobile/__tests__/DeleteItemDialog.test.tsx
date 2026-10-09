/**
 * @format
 */

import React from 'react';
import { Modal, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import type { Item } from '@apc/shared/items';
import { MOBILE_DESIGN_HEIGHT, MOBILE_DESIGN_WIDTH } from '@apc/shared/screens';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { DeleteItemDialog } from '../src/inventory/DeleteItemDialog';
import { themeStorage, ThemeProvider } from '../src/theme';
import { ToastProvider } from '../src/Toast';

const FILTER: Item = {
  id: '00000000-0000-4000-8000-000000000001',
  code: 'W 712/95',
  name: 'Filtro de óleo',
  category: 'Motor',
  partBrand: 'Mann',
  vehicleBrand: 'Volkswagen',
  vehicleModel: 'Gol',
  position: 'N/A',
  side: 'N/A',
  color: 'N/A',
  location: null,
  quantity: 4,
  minQuantity: 1,
  unitPriceCents: 3990,
  photos: [],
  createdAt: '2026-10-03T12:00:00.000Z',
  updatedAt: '2026-10-03T12:00:00.000Z',
};
// Trees the test rendered, unmounted after it so the toast's hide timer doesn't outlive the test.
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
// A phone's screen with no notch, so the toast has its insets.
const SAFE_AREA = { frame: { x: 0, y: 0, width: MOBILE_DESIGN_WIDTH, height: MOBILE_DESIGN_HEIGHT }, insets: { top: 0, right: 0, bottom: 0, left: 0 } };

/**
 * Finds the pressable that shows a text.
 * @param tree Rendered tree.
 * @param name The text inside.
 * @returns The pressable.
 */
function button(tree: ReactTestRenderer.ReactTestRenderer, name: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.findAll(
    (n) => typeof n.props.onPress === 'function' && n.findAll((c) => c.type === Text && c.props.children === name).length > 0,
  )[0];
}

/**
 * Renders the confirmation on the filter inside the theme and toast providers.
 * @param props What the owner hands the dialog.
 * @param style Style to start on.
 * @param mode Mode to start on.
 * @returns The rendered tree.
 */
async function mount(
  props: { onClose?: () => void; onDeleted?: (item: Item) => void } = {},
  style: Style = 'eighties',
  mode: Mode = 'night',
) {
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: style, [THEME_STORAGE_KEYS.mode]: mode });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>
          <ToastProvider>
            <DeleteItemDialog open item={FILTER} onClose={props.onClose ?? (() => {})} onDeleted={props.onDeleted ?? (() => {})} />
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(tree!);
  return tree!;
}

/**
 * Presses the pressable that shows a text.
 * @param tree Rendered tree.
 * @param name The text inside.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, name: string) {
  await ReactTestRenderer.act(async () => button(tree, name).props.onPress());
}

/**
 * Tells whether a text is on screen.
 * @param tree Rendered tree.
 * @param text Exact text.
 * @returns True when a Text shows it.
 */
function shows(tree: ReactTestRenderer.ReactTestRenderer, text: string): boolean {
  return tree.root.findAll((n) => typeof n.type === 'string' && n.props.children === text).length > 0;
}

beforeEach(async () => {
  await themeStorage.clear();
});

afterEach(async () => {
  await ReactTestRenderer.act(async () => mounted.splice(0).forEach((tree) => tree.unmount()));
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens the confirmation in one style and mode and checks Excluir's Pressable (the only node whose style is a
    // function of the press state) is filled with the danger color.
    test(`Mobile: the delete confirmation follows the ${style}/${mode} theme`, async () => {
      const tree = await mount({}, style, mode);
      const confirm = button(tree, 'Excluir').findAll((n) => typeof n.props.style === 'function')[0];
      expect(StyleSheet.flatten(confirm.props.style({ pressed: false })).backgroundColor).toBe(themes[style][mode].colors.danger);
    });
  }
}

// Opens the confirmation and checks it names the item and its code, then closes it with Cancel and with the back
// button, and checks nothing was sent either time.
test('Mobile: Cancel and the back button close the confirmation without deleting', async () => {
  const onClose = jest.fn();
  const tree = await mount({ onClose });
  expect(shows(tree, 'Excluir item?')).toBe(true);
  expect(shows(tree, 'Filtro de óleo (W 712/95) sai do estoque. Essa ação não pode ser desfeita.')).toBe(true);
  (fetch as jest.Mock).mockClear();
  await press(tree, 'Cancelar');
  await ReactTestRenderer.act(async () => tree.root.findByType(Modal).props.onRequestClose());
  expect(onClose).toHaveBeenCalledTimes(2);
  expect(fetch).not.toHaveBeenCalled();
});

// Confirms and checks the item is deleted by its id, a toast names it and the removal is handed over.
test('Mobile: confirming deletes the item, announces it and hands it over', async () => {
  const onDeleted = jest.fn();
  const tree = await mount({ onDeleted });
  (fetch as jest.Mock).mockClear();
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 204 });
  await press(tree, 'Excluir');
  expect(fetch).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`/items/${FILTER.id}$`)), { method: 'DELETE' });
  expect(onDeleted).toHaveBeenCalledWith(FILTER);
  expect(shows(tree, 'Item “Filtro de óleo” excluído.')).toBe(true);
});

// Confirms while the API fails and checks a toast says so and nothing is handed over.
test('Mobile: a failed delete says so and hands nothing over', async () => {
  const onDeleted = jest.fn();
  const tree = await mount({ onDeleted });
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });
  await press(tree, 'Excluir');
  expect(onDeleted).not.toHaveBeenCalled();
  expect(shows(tree, 'Não foi possível excluir o item. Tente de novo.')).toBe(true);
});
