/**
 * @format
 */

import React from 'react';
import { Share, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { CSV_COLUMNS, CSV_PHOTOS_COLUMN } from '@apc/shared/item-csv';
import type { Item } from '@apc/shared/items';
import { MOBILE_DESIGN_HEIGHT, MOBILE_DESIGN_WIDTH } from '@apc/shared/screens';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes } from '@apc/shared/theme';
import { API_URL } from '../src/api';
import { ExportItemsDialog } from '../src/inventory/ExportItemsDialog';
import { themeStorage, ThemeProvider } from '../src/theme';
import { ToastProvider } from '../src/Toast';

// An item as the API sends it, with a photo.
const ITEM: Item = {
  id: '00000000-0000-4000-8000-000000000001',
  code: 'BKR6E',
  name: 'Vela de ignição',
  category: 'Motor',
  partBrand: 'NGK',
  vehicleBrand: 'Volkswagen',
  vehicleModel: null,
  position: 'N/A',
  side: 'N/A',
  color: 'N/A',
  location: 'A-3',
  quantity: 24,
  minQuantity: 8,
  unitPriceCents: 2490,
  photos: [{ id: '00000000-0000-4000-8000-0000000000a1', url: '/photos/a1.jpg', thumbUrl: '/photos/a1-thumb.webp' }],
  createdAt: '2026-10-03T12:00:00.000Z',
  updatedAt: '2026-10-03T12:00:00.000Z',
};
// Trees the test rendered, unmounted after it so the toast's hide timer doesn't outlive the test.
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
// A phone's screen with no notch, so the toast has its insets.
const SAFE_AREA = { frame: { x: 0, y: 0, width: MOBILE_DESIGN_WIDTH, height: MOBILE_DESIGN_HEIGHT }, insets: { top: 0, right: 0, bottom: 0, left: 0 } };

/**
 * Has the API answer the list with the items given.
 * @param items The items of the list.
 */
function answerList(items: Item[]) {
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items, total: items.length }) });
}

/**
 * Finds a button's Pressable by the label it shows.
 * @param tree Rendered tree.
 * @param label The button's label.
 * @returns The Pressable, whose style is a function of its pressed state.
 */
function button(tree: ReactTestRenderer.ReactTestRenderer, label: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.findAll(
    (n) => typeof n.props.style === 'function' && n.findAll((t) => typeof t.type === 'string' && t.props.children === label).length > 0,
  )[0];
}

/**
 * Renders the dialog open inside the theme and toast providers.
 * @param props What the list holds, and what the dialog does on close.
 * @returns The rendered tree.
 */
async function mount(props: { count?: number; narrowed?: boolean; onClose?: () => void } = {}) {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>
          <ToastProvider>
            <ExportItemsDialog
              open
              query="status=low&sort=price&order=desc"
              count={props.count ?? 12}
              narrowed={props.narrowed ?? true}
              onClose={props.onClose ?? (() => {})}
            />
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(tree!);
  return tree!;
}

/**
 * Finds the pressable with an accessible name or visible text.
 * @param tree Rendered tree.
 * @param name The accessibility label, or the text inside.
 * @returns The pressable.
 */
function pressable(tree: ReactTestRenderer.ReactTestRenderer, name: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.findAll(
    (n) =>
      typeof n.props.onPress === 'function' &&
      (n.props.accessibilityLabel === name || n.findAll((c) => c.type === Text && c.props.children === name).length > 0),
  )[0];
}

/**
 * Presses the pressable with an accessible name or visible text.
 * @param tree Rendered tree.
 * @param name The accessibility label, or the text inside.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, name: string) {
  await ReactTestRenderer.act(async () => pressable(tree, name).props.onPress());
}

/**
 * Tells whether a text shows anywhere in the tree.
 * @param tree Rendered tree.
 * @param text Text to look for.
 * @returns True when a Text holds it.
 */
function shows(tree: ReactTestRenderer.ReactTestRenderer, text: string): boolean {
  return tree.root.findAll((n) => n.type === Text && n.props.children === text).length > 0;
}

beforeEach(async () => {
  await themeStorage.clear();
});

afterEach(async () => {
  await ReactTestRenderer.act(async () => mounted.splice(0).forEach((tree) => tree.unmount()));
  jest.restoreAllMocks();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens the export in one style and mode and checks it says which items go, offers the photo paths switched off,
    // and "Exportar" is filled with the accent.
    test(`Mobile: the CSV export follows the ${style}/${mode} theme`, async () => {
      await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: style, [THEME_STORAGE_KEYS.mode]: mode });
      const tree = await mount();
      expect(shows(tree, '12 itens, com a busca e os filtros atuais.')).toBe(true);
      const toggle = tree.root.find((n) => n.props.accessibilityRole === 'switch' && typeof n.props.onPress === 'function');
      expect(toggle.props.accessibilityState).toMatchObject({ checked: false });
      const exportar = button(tree, 'Exportar');
      expect(StyleSheet.flatten(exportar.props.style({ pressed: false })).backgroundColor).toBe(themes[style][mode].colors.accent);
    });
  }
}

// Turns the photo paths on and exports, and checks every item of the list is fetched with the list query and no page,
// the share sheet gets the file with the photos column, a toast confirms it and the dialog closes.
test('Mobile: Exportar fetches the whole list and shares it with the photo paths', async () => {
  answerList([ITEM]);
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
  const onClose = jest.fn();
  const tree = await mount({ count: 1, onClose });
  await press(tree, 'Incluir o caminho das fotos');
  await press(tree, 'Exportar');
  expect((fetch as jest.Mock).mock.calls.at(-1)[0]).toBe(`${API_URL}/items?status=low&sort=price&order=desc`);
  const { title, message } = share.mock.calls[0][0] as { title: string; message: string };
  expect(title).toMatch(/^estoque-\d{4}-\d{2}-\d{2}\.csv$/);
  const [header, row] = message.replace(/^﻿/, '').split('\r\n');
  expect(header).toBe(`${CSV_COLUMNS.join(',')},${CSV_PHOTOS_COLUMN}`);
  expect(row.endsWith(',/photos/a1.jpg')).toBe(true);
  expect(shows(tree, '1 item exportado.')).toBe(true);
  expect(onClose).toHaveBeenCalledTimes(1);
});

// Exports with the photo paths left off and closes the share sheet without sharing, and checks the file has only the
// template's columns, and the dialog stays open without a toast.
test('Mobile: without the switch the file has no photos column, and a closed share sheet keeps the dialog', async () => {
  answerList([ITEM]);
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'dismissedAction', activityType: undefined });
  const onClose = jest.fn();
  const tree = await mount({ count: 1, onClose });
  await press(tree, 'Exportar');
  const { message } = share.mock.calls[0][0] as { message: string };
  expect(message.replace(/^﻿/, '').split('\r\n')[0]).toBe(CSV_COLUMNS.join(','));
  expect(shows(tree, '1 item exportado.')).toBe(false);
  expect(onClose).not.toHaveBeenCalled();
});

// Makes the items fail to come, and checks a toast says so, nothing is shared and the dialog stays open.
test('Mobile: a failed export says so and keeps the dialog open', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });
  const share = jest.spyOn(Share, 'share');
  const onClose = jest.fn();
  const tree = await mount({ onClose });
  await press(tree, 'Exportar');
  expect(shows(tree, 'Não foi possível exportar os itens. Tente de novo.')).toBe(true);
  expect(share).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

// Opens the export with the whole inventory and then with an empty list, and checks it says which items go and, with
// none, can't export.
test('Mobile: the export says which items go, and has nothing to export from an empty list', async () => {
  const whole = await mount({ count: 40, narrowed: false });
  expect(shows(whole, 'Todos os 40 itens do estoque.')).toBe(true);
  const empty = await mount({ count: 0 });
  expect(shows(empty, 'Nenhum item na lista para exportar.')).toBe(true);
  expect(button(empty, 'Exportar').props.accessibilityState).toMatchObject({ disabled: true });
});
