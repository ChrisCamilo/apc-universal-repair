/**
 * @format
 */

import React from 'react';
import { BackHandler, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { ENGINE_SHEETS, NO_SHEET_MESSAGE } from '@apc/domain/catalog';
import type { Item } from '@apc/domain/items';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/tokens/theme';
import { CatalogTab } from '../src/features/catalog/CatalogTab';
import { PhoneHeaderContext, type PhoneHeader } from '../src/features/dashboard/phoneHeaderContext';
import { themeStorage, ThemeProvider } from '../src/app/theme';
import { testItem, type FlatItem } from '@apc/domain/test-items';

const OPALA_41 = ENGINE_SHEETS['chevrolet-opala-diplomata-1986-4.1'];
// What Android's back button calls.
type BackListener = Parameters<typeof BackHandler.addEventListener>[1];
// Parts in the inventory, for the code search: an engine the catalog has and one it lacks.
const PARTS: Item[] = [
  part({
    id: '00000000-0000-4000-8000-000000000001',
    code: 'FRA-1000',
    name: 'Pastilha de freio dianteira',
    vehicleBrand: 'Chevrolet',
    vehicleModel: 'Opala 4.1',
  }),
  part({
    id: '00000000-0000-4000-8000-000000000002',
    code: 'FRA-10002',
    name: 'Pastilha de freio traseira',
    vehicleBrand: 'Chevrolet',
    vehicleModel: 'Opala 3.8',
  }),
];

/**
 * Saves a style and mode, renders the Catalog under a header inside a ThemeProvider and waits for it to load.
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
        <Harness />
      </ThemeProvider>,
    );
  });
  return tree!;
}

/**
 * Fills in an inventory item with the fields the Catalog doesn't look at.
 * @param fields The fields that matter here.
 * @returns A complete item.
 */
function part(fields: Required<Pick<FlatItem, 'id' | 'code' | 'name' | 'vehicleBrand' | 'vehicleModel'>>): Item {
  return testItem({
    category: 'Freios',
    partBrand: 'Cobreq',
    position: 'N/A',
    side: 'N/A',
    color: 'N/A',
    location: null,
    quantity: 1,
    minQuantity: 0,
    unitPriceCents: 100,
    photos: [],
    createdAt: '2026-10-03T12:00:00.000Z',
    updatedAt: '2026-10-03T12:00:00.000Z',
    ...fields,
  });
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
 * Types into a search field.
 * @param tree Rendered tree.
 * @param label The field's accessible name.
 * @param text Text to type.
 */
async function search(tree: ReactTestRenderer.ReactTestRenderer, label: string, text: string) {
  const input = tree.root.find((n) => n.type === TextInput && n.props.accessibilityLabel === label);
  await ReactTestRenderer.act(async () => input.props.onChangeText(text));
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

afterEach(() => {
  jest.restoreAllMocks();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens the Catalog in one style and mode and checks the brands' letters take that combination's accent, then
    // opens the Opala's 4.1 engine and checks the "Ver ficha" of the chosen engine and the sheet's readouts take it too.
    test(`Mobile: the Catalog follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(style, mode);
      expect(StyleSheet.flatten(textNode(tree, 'CH').props.style).color).toBe(colors.accent);
      await openOpala41(tree);
      expect(StyleSheet.flatten(textNode(tree, OPALA_41.specs[1]).props.style).color).toBe(colors.accent);
      await press(tree, 'Voltar aos modelos');
      expect(StyleSheet.flatten(textNode(tree, 'Ver ficha', 1).props.style).backgroundColor).toBe(colors.accent);
    });
  }
}

// Checks the Catalog opens on the brand lines, each with its letters and its models and sheets, with no brand search,
// then presses Chevrolet and checks the header turns to the brand with a ← and the tree's engines say "Ver ficha",
// opens the 4.1 engine and checks its sheet shows under the path to it with each readout named. The ← goes back to
// the models, open on the engine just seen, and Android's back button to the brands, where it no longer stays in the
// tab.
test('Mobile: the Catalog goes from a brand to an engine sheet and back', async () => {
  const backs = backButton();
  const tree = await mount('eighties', 'night');
  const lines = () => tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'catalog.catalog-tab.screen.brands.brand');
  expect(lines().map((n) => n.props.accessibilityLabel)).toEqual([
    'Chevrolet, 3 modelos · 2 fichas técnicas',
    'Volkswagen, 3 modelos · 1 ficha técnica',
    'Fiat, 3 modelos · 1 ficha técnica',
    'Ford, 3 modelos · sem ficha técnica ainda',
  ]);
  expect(['CH', 'VW', 'FI', 'FO'].every((mark) => shows(tree, mark))).toBe(true);
  expect(shows(tree, 'Marcas · 4')).toBe(true);
  expect(tree.root.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === 'Procure marca')).toHaveLength(0);
  expect(backs.pressed()).toBeNull();

  await openOpala41(tree);
  expect(shows(tree, OPALA_41.title)).toBe(true);
  expect(shows(tree, 'Opala › Terceira geração › Diplomata › 1986')).toBe(true);
  expect(['Ano', 'Motor', 'Cilindros', 'Tração'].every((label) => shows(tree, label))).toBe(true);
  expect(title(tree)).toBe('Chevrolet');

  await press(tree, 'Voltar aos modelos');
  expect(byRole(tree, 'treeitem', '4.1 L 6 cilindros').props.accessibilityState).toMatchObject({ selected: true });
  expect(shows(tree, 'Modelos · 3')).toBe(true);
  expect(textNodes(tree, 'Ver ficha')).toHaveLength(2);
  await ReactTestRenderer.act(async () => expect(backs.pressed()).toBe(true));
  expect(lines()).toHaveLength(4);
  expect(title(tree)).toBe('Catálogo');
  expect(backs.pressed()).toBeNull();
});

// Searches a model only Fiat has and checks the brands narrow to Fiat and its tree to the model, then types part codes
// and checks the parts show as the Inventory's cards under a heading, and a press on one clears the search and opens
// its engine's sheet, or, for a model without a sheet, its brand's models with the model pointed out and the note.
test('Mobile: the Catalog search narrows the brands and opens a part found by code', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: PARTS, total: PARTS.length }) });
  const tree = await mount('fiat90', 'day');
  await search(tree, 'Procure modelo ou código da peça', 'uno');
  expect(shows(tree, 'Marcas · 1')).toBe(true);
  await press(tree, 'Fiat, 3 modelos · 1 ficha técnica');
  expect(shows(tree, 'Modelos · 1')).toBe(true);
  await press(tree, 'Voltar às marcas');

  await search(tree, 'Procure modelo ou código da peça', 'fra1000');
  expect(shows(tree, 'Peças do estoque com esse código')).toBe(true);
  const cards = () => tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'common.data-table.table.row');
  expect(cards()).toHaveLength(2);
  expect(shows(tree, 'FRA-1000 · Cobreq')).toBe(true);
  expect(shows(tree, 'FRA-10002 · Cobreq')).toBe(true);
  await ReactTestRenderer.act(async () => pressable(cards()[0]).props.onPress());
  expect(shows(tree, OPALA_41.title)).toBe(true);
  await press(tree, 'Voltar aos modelos');
  expect(tree.root.find((n) => n.type === TextInput).props.value).toBe('');

  await search(tree, 'Procure modelo ou código da peça', 'fra10002');
  await ReactTestRenderer.act(async () => pressable(cards()[0]).props.onPress());
  expect(title(tree)).toBe('Chevrolet');
  expect(byRole(tree, 'treeitem', 'Opala').props.accessibilityValue).toEqual({ text: 'em destaque' });
  expect(shows(tree, 'Chevrolet Opala 3.8')).toBe(true);
  expect(shows(tree, NO_SHEET_MESSAGE)).toBe(true);
});

/**
 * Stands in for Android's back button: keeps the listener the Catalog adds, while it is added.
 * @returns Presses the button, giving what the listener answered, or null when none listens.
 */
function backButton() {
  let listener: BackListener | null = null;
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    listener = handler;
    return {
      remove: () => {
        if (listener === handler) {
          listener = null;
        }
      },
    };
  });
  return { pressed: () => (listener ? listener({} as Parameters<BackListener>[0]) : null) };
}

/**
 * Opens Chevrolet, the Opala's tree down to its 1986 engines, and the 4.1's sheet.
 * @param tree Rendered tree.
 */
async function openOpala41(tree: ReactTestRenderer.ReactTestRenderer) {
  await press(tree, 'Chevrolet, 3 modelos · 2 fichas técnicas');
  for (const name of ['Opala', 'Terceira geração 1980–1992', 'Diplomata', '1986', '4.1 L 6 cilindros']) {
    await press(tree, name);
  }
}

/**
 * Finds the Pressable that holds a host element.
 * @param node A host element.
 * @returns The closest Pressable above it, or the node itself when it is pressable.
 */
function pressable(node: ReactTestRenderer.ReactTestInstance): ReactTestRenderer.ReactTestInstance {
  let current: ReactTestRenderer.ReactTestInstance | null = node;
  while (current && typeof current.props.onPress !== 'function') {
    current = current.parent;
  }
  return current!;
}

/**
 * Finds the Texts showing a text.
 * @param tree Rendered tree.
 * @param text Exact text.
 * @returns The Text elements.
 */
function textNodes(tree: ReactTestRenderer.ReactTestRenderer, text: string): ReactTestRenderer.ReactTestInstance[] {
  return tree.root.findAll((n) => n.type === Text && n.props.children === text);
}

/**
 * Finds a Text showing a text.
 * @param tree Rendered tree.
 * @param text Exact text.
 * @param index Which of the Texts showing it, in order.
 * @returns The Text element.
 */
function textNode(tree: ReactTestRenderer.ReactTestRenderer, text: string, index = 0): ReactTestRenderer.ReactTestInstance {
  return textNodes(tree, text)[index];
}

/**
 * Reads the header's title.
 * @param tree Rendered tree.
 * @returns The title the harness shows.
 */
function title(tree: ReactTestRenderer.ReactTestRenderer): string {
  return tree.root.find((n) => n.type === Text && n.props.accessibilityRole === 'header' && n.props.testID === 'harness.title').props.children;
}

/** The Catalog under the Dashboard's header: the tab's name, or a deeper screen's title with its ←. */
function Harness() {
  const [header, setHeader] = React.useState<PhoneHeader | null>(null);
  return (
    <PhoneHeaderContext.Provider value={setHeader}>
      {header && <Pressable accessibilityLabel={header.back.label} onPress={header.back.onPress} />}
      <Text accessibilityRole="header" testID="harness.title">
        {header?.title ?? 'Catálogo'}
      </Text>
      <CatalogTab />
    </PhoneHeaderContext.Provider>
  );
}
