/**
 * @format
 */

import React from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { ENGINE_SHEETS } from '@apc/shared/catalog';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { CatalogTab } from '../src/dashboard/CatalogTab';
import { themeStorage, ThemeProvider } from '../src/theme';

const OPALA_25 = ENGINE_SHEETS['chevrolet-opala-diplomata-1986-2.5'];

/**
 * Saves a style and mode, renders the Catalog inside a ThemeProvider and waits for it to load.
 * @param style Style to start on.
 * @param mode Mode to start on.
 * @returns The rendered tree.
 */
async function mount(style: Style, mode: Mode) {
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: style, [THEME_STORAGE_KEYS.mode]: mode });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <CatalogTab />
      </ThemeProvider>,
    );
  });
  return tree!;
}

/**
 * Presses the pressable with an accessible name.
 * @param tree Rendered tree.
 * @param name The accessibility label.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, name: string) {
  const node = tree.root.findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === name)[0];
  await ReactTestRenderer.act(async () => node.props.onPress());
}

/**
 * Finds the host element with an accessible name and role.
 * @param tree Rendered tree.
 * @param role The accessibility role.
 * @param name The accessibility label.
 * @returns The host element.
 */
function byRole(tree: ReactTestRenderer.ReactTestRenderer, role: string, name: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find(
    (n) => typeof n.type === 'string' && (n.props.accessibilityRole === role || n.props.role === role) && n.props.accessibilityLabel === name,
  );
}

/**
 * Tells whether a text is on screen.
 * @param tree Rendered tree.
 * @param text Exact text.
 * @returns True when a Text shows it.
 */
function shows(tree: ReactTestRenderer.ReactTestRenderer, text: string): boolean {
  return tree.root.findAll((n) => n.type === Text && n.props.children === text).length > 0;
}

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens the Catalog in one style and mode and checks the chosen brand tile and the sheet's readouts take that
    // combination's accent.
    test(`Mobile: the Catalog follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(style, mode);
      const chevrolet = tree.root.findAll((n) => typeof n.props.style === 'function' && n.props.accessibilityLabel === 'Chevrolet')[0];
      expect(chevrolet.props.style({ pressed: false }).borderColor).toBe(colors.accent);
      const readout = tree.root.findAll((n) => n.type === Text && n.props.children === OPALA_25.specs[1])[0];
      expect(StyleSheet.flatten(readout.props.style).color).toBe(colors.accent);
    });
  }
}

// Opens the Catalog and checks it starts on Chevrolet with its first engine chosen and its sheet shown, then picks the
// other Opala engine, Volkswagen and Ford, and checks the tree and the sheet follow, Ford saying it has no sheet yet.
test('Mobile: brands and engines drive the tree and the sheet', async () => {
  const tree = await mount('eighties', 'night');
  expect(byRole(tree, 'radio', 'Chevrolet').props.accessibilityState).toMatchObject({ checked: true });
  expect(byRole(tree, 'treeitem', '2.5 L 4 cilindros').props.accessibilityState).toMatchObject({ selected: true });
  expect(shows(tree, OPALA_25.title)).toBe(true);
  expect(shows(tree, OPALA_25.summary)).toBe(true);

  await press(tree, '4.1 L 6 cilindros');
  expect(shows(tree, ENGINE_SHEETS['chevrolet-opala-diplomata-1986-4.1'].title)).toBe(true);

  await press(tree, 'Volkswagen');
  expect(byRole(tree, 'tree', 'Modelos Volkswagen')).toBeDefined();
  expect(byRole(tree, 'treeitem', '1.8 L 4 cilindros').props.accessibilityState).toMatchObject({ selected: true });
  expect(shows(tree, ENGINE_SHEETS['volkswagen-gol-gts-1989-1.8'].title)).toBe(true);

  await press(tree, 'Ford');
  expect(byRole(tree, 'tree', 'Modelos Ford')).toBeDefined();
  expect(shows(tree, 'Nenhuma ficha cadastrada')).toBe(true);
});

// Lays the brand tiles out on a 390dp phone and on a 768dp tablet, and checks they sit two to a row on the phone and
// four on the tablet, and the tree scrolls inside its own height.
test('Mobile: brand tiles sit two to a row on a phone and four on a tablet', async () => {
  const before = Dimensions.get('window');
  const screen = (width: number, height: number) =>
    ReactTestRenderer.act(() => Dimensions.set({ window: { width, height, scale: 2, fontScale: 1 }, screen: { width, height, scale: 2, fontScale: 1 } }));
  /** Counts the tiles in each row of the brand group. */
  const rows = (tree: ReactTestRenderer.ReactTestRenderer) =>
    tree.root
      .find((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'radiogroup')
      .findAll((n) => typeof n.type === 'string' && StyleSheet.flatten(n.props.style)?.flexDirection === 'row')
      .map((row) => row.findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'radio').length);

  await screen(390, 844);
  const tree = await mount('gt4', 'day');
  expect(rows(tree)).toEqual([2, 2]);
  expect(byRole(tree, 'tree', 'Modelos Chevrolet').props.style).toMatchObject({ maxHeight: 384 });
  await screen(768, 1024);
  expect(rows(tree)).toEqual([4]);
  await screen(before.width, before.height);
});
