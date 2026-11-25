/**
 * @format
 */

import React from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { PHOTO_PICKER } from '@apc/domain/item-form';
import type { Item, ItemPhoto } from '@apc/domain/items';
import { testItem } from '@apc/domain/test-items';
import { MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/ui-spec/screens';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/tokens/theme';
import { themeStorage, ThemeProvider } from '../src/app/theme';
import { PhotoPickerDialog } from '../src/features/inventory/photos/PhotoPickerDialog';

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
const SAFE_AREA = { frame: { x: 0, y: 0, width: MIN_MOBILE_WIDTH, height: MIN_MOBILE_HEIGHT }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
/** A photo the API saved, by its id. */
const photo = (id: string): ItemPhoto => ({ id: `00000000-0000-4000-8000-0000000000${id}`, url: `/photos/${id}.png`, thumbUrl: `/photos/${id}-t.webp` });
// A brake disc of two photos, a pad of one under its second brand, and a filter without photos.
const DISC = testItem({ name: 'Disco de freio', code: 'BD-3377', partBrand: 'Fremax', photos: [photo('d1'), photo('d2')] });
const PADS = testItem({
  name: 'Pastilha',
  originalCodes: ['BD 33'],
  brands: [
    { id: '00000000-0000-4000-8000-0000000000b1', partBrand: 'Cobreq', code: 'N-1', color: 'N/A', location: null, quantity: 1, unitPriceCents: 100, photos: [] },
    { id: '00000000-0000-4000-8000-0000000000b2', partBrand: 'Fras-le', code: 'N-2', color: 'N/A', location: null, quantity: 1, unitPriceCents: 100, photos: [photo('p1')] },
  ],
});
const FILTER = testItem({ name: 'Filtro', code: 'BD-9000' });
const ITEMS: Item[] = [DISC, PADS, FILTER];

/**
 * Saves a style and mode, renders the picker inside the app's providers and waits for the theme to load.
 * @param props The picker's props that matter for the test.
 * @param style Style to start on.
 * @param mode Mode to start on.
 * @returns The rendered tree.
 */
async function mount(props: Partial<React.ComponentProps<typeof PhotoPickerDialog>> = {}, style: Style = 'eighties', mode: Mode = 'night') {
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: style, [THEME_STORAGE_KEYS.mode]: mode });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>
          <PhotoPickerDialog open onClose={() => {}} items={ITEMS} room={3} onPick={() => {}} {...props} />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(tree!);
  return tree!;
}

/**
 * Types the search.
 * @param tree Rendered tree.
 * @param text Text to type.
 */
async function search(tree: ReactTestRenderer.ReactTestRenderer, text: string) {
  const input = tree.root.find((n) => n.type === TextInput && n.props.accessibilityLabel === PHOTO_PICKER.search);
  await ReactTestRenderer.act(async () => input.props.onChangeText(text));
}

/**
 * Finds a pressable by its accessible name or visible text, and its role.
 * @param tree Rendered tree.
 * @param name Accessibility label or text.
 * @param role Its accessibility role.
 * @returns The Pressable test instance.
 */
function pressable(tree: ReactTestRenderer.ReactTestRenderer, name: string, role = 'button') {
  return tree.root.find(
    (n) =>
      typeof n.props.onPress === 'function' &&
      typeof n.type !== 'string' &&
      n.props.accessibilityRole === role &&
      (n.props.accessibilityLabel === name || n.findAll((c) => c.type === Text && c.props.children === name).length > 0),
  );
}

/**
 * Presses a pressable found by name and role.
 * @param tree Rendered tree.
 * @param name Accessibility label or text.
 * @param role Its accessibility role.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, name: string, role = 'button') {
  const node = pressable(tree, name, role);
  await ReactTestRenderer.act(async () => node.props.onPress());
}

/**
 * Lists every text shown.
 * @param tree Rendered tree.
 * @returns The texts, in order.
 */
function texts(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root.findAllByType(Text).map((t) => [t.props.children].flat().join(''));
}

beforeEach(async () => {
  await themeStorage.clear();
});

afterEach(async () => {
  await ReactTestRenderer.act(async () => mounted.splice(0).forEach((tree) => tree.unmount()));
});

// Opens the picker and checks it asks for a code, then lists only the items with photos whose code holds the search,
// the exact original code first, leaves out the item being edited, and says when nothing is found.
test('Mobile: the picker finds the items with photos by code', async () => {
  const tree = await mount();
  expect(texts(tree)).toContain(PHOTO_PICKER.hint);
  await search(tree, 'bd33');
  const names = () => tree.root.findAll((n) => n.props.testID === 'inventory.photo-picker.list.source.head.text.name' && typeof n.type === 'string');
  expect(names().map((name) => name.props.children)).toEqual(['Pastilha', 'Disco de freio']);
  expect(texts(tree)).toContain('BD-3377 · Fremax · 2 fotos');
  await search(tree, 'bd-9000');
  expect(texts(tree)).toContain(PHOTO_PICKER.none);
  const editing = await mount({ editingId: DISC.id });
  await search(editing, 'bd');
  expect(() => pressable(editing, 'Disco de freio')).toThrow();
});

// Opens two items, checks one photo of each up to a room of two, and checks the others are disabled and the count
// says it is full; "Usar 2 fotos" hands them over in the order they were checked. Cancelar hands nothing over.
test('Mobile: photos are checked from several items up to the room, and handed over in order', async () => {
  const onPick = jest.fn();
  const onClose = jest.fn();
  const tree = await mount({ room: 2, onPick, onClose });
  expect(pressable(tree, 'Usar fotos').props.disabled).toBe(true);
  await search(tree, 'bd');
  await press(tree, 'Pastilha');
  await press(tree, 'Disco de freio');
  expect(pressable(tree, 'Disco de freio').props.accessibilityState).toEqual({ expanded: true });
  await press(tree, 'Foto 2 de Disco de freio · Fremax', 'checkbox');
  await press(tree, 'Foto 1 de Pastilha · Fras-le', 'checkbox');
  expect(pressable(tree, 'Foto 1 de Disco de freio · Fremax', 'checkbox').props.accessibilityState).toEqual({ checked: false, disabled: true });
  expect(texts(tree)).toContain('2 de 2 fotos escolhidas: desmarque uma para trocar.');
  await press(tree, 'Usar 2 fotos');
  expect(onPick).toHaveBeenCalledWith([photo('d2'), photo('p1')]);
  await press(tree, PHOTO_PICKER.cancel);
  expect(onClose).toHaveBeenCalled();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Checks a photo in one style and mode and checks its frame takes the accent and the count turns to the warn color
    // once the brand is full.
    test(`Mobile: a checked photo takes the accent in ${style}/${mode}`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount({ room: 1 }, style, mode);
      await search(tree, '3377');
      await press(tree, 'Disco de freio');
      await press(tree, 'Foto 1 de Disco de freio · Fremax', 'checkbox');
      const tile = pressable(tree, 'Foto 1 de Disco de freio · Fremax', 'checkbox');
      expect(StyleSheet.flatten(tile.props.style).borderColor).toBe(colors.accent);
      const count = tree.root.find((n) => n.props.testID === 'inventory.photo-picker.count' && typeof n.type === 'string');
      expect(StyleSheet.flatten(count.props.style).color).toBe(colors.warn);
    });
  }
}
