/**
 * @format
 */

import React from 'react';
import { Pressable } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { INVENTORY_TUTORIAL_STORAGE_KEY } from '@apc/shared/inventory-tutorial';
import { REORDER_TABS_STORAGE_KEY, TAB_ORDER_STORAGE_KEY } from '@apc/shared/tabs';
import { Dashboard } from '../src/dashboard/Dashboard';
import { useTabReorder } from '../src/dashboard/tabReorderContext';
import { themeStorage, ThemeProvider } from '../src/theme';

// The MVP has one tab; three let the order change. The Catalog and Specs tabs stand in for the ones to come.
jest.mock('@apc/shared/tabs', () => ({
  ...jest.requireActual('@apc/shared/tabs'),
  DASHBOARD_TABS: [
    { id: 'inventory', label: 'Estoque', icon: 'cube' },
    { id: 'catalog', label: 'Catálogo', icon: 'document' },
    { id: 'specs', label: 'Ficha técnica', icon: 'document' },
  ],
}));

/**
 * Renders the Dashboard, with a switch for the reorder choice in its user menu slot, and waits for it to load.
 * @returns The rendered tree.
 */
async function mount() {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <Dashboard userMenu={<ReorderSwitch />} />
      </ThemeProvider>,
    );
  });
  return tree!;
}

/**
 * Finds a tab by its label.
 * @param tree Rendered tree.
 * @param label The tab's label.
 * @returns The tab's Pressable.
 */
function tab(tree: ReactTestRenderer.ReactTestRenderer, label: string): ReactTestRenderer.ReactTestInstance {
  return tabs(tree).find((n) => n.findAll((t) => typeof t.type === 'string' && t.props.children === label).length > 0)!;
}

/**
 * Lists the tabs in the order the tab bar shows them.
 * @param tree Rendered tree.
 * @returns The tabs' Pressables.
 */
function tabs(tree: ReactTestRenderer.ReactTestRenderer): ReactTestRenderer.ReactTestInstance[] {
  return tree.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'tab');
}

/**
 * Reads the tab labels in the order the tab bar shows them.
 * @param tree Rendered tree.
 * @returns The labels.
 */
function tabOrder(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tabs(tree).map((n) => n.findAll((t) => typeof t.type === 'string' && typeof t.props.children === 'string')[0].props.children);
}

beforeEach(async () => {
  await themeStorage.clear();
  // The Inventory tutorial counts as seen, so it doesn't start by itself over what the test looks at.
  await themeStorage.setItem(INVENTORY_TUTORIAL_STORAGE_KEY, 'true');
});

// Checks the tabs offer no move actions while "Arrastar para reordenar" is off, then turns it on and moves the open
// tab one place right, and checks the new order shows and is saved, and the moved tab stays open.
test('Mobile: the tabs move only while reordering is on, and the open tab stays open', async () => {
  const tree = await mount();
  expect(tab(tree, 'Estoque').props.accessibilityActions).toBeUndefined();

  const toggle = tree.root.findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Reordenar')[0];
  await ReactTestRenderer.act(async () => toggle.props.onPress());
  expect(await themeStorage.getItem(REORDER_TABS_STORAGE_KEY)).toBe('true');
  expect(tab(tree, 'Estoque').props.accessibilityActions.map((action: { name: string }) => action.name)).toEqual(['moveLeft', 'moveRight']);
  await ReactTestRenderer.act(async () => tab(tree, 'Estoque').props.onAccessibilityAction({ nativeEvent: { actionName: 'moveRight' } }));
  expect(tabOrder(tree)).toEqual(['Catálogo', 'Estoque', 'Ficha técnica']);
  expect(JSON.parse((await themeStorage.getItem(TAB_ORDER_STORAGE_KEY))!)).toEqual(['catalog', 'inventory', 'specs']);
  expect(tab(tree, 'Estoque').props.accessibilityState).toEqual({ selected: true });
});

// Saves an order that knows only two of the tabs and the reorder choice on, and checks the Dashboard opens in the
// saved order, with the tab it didn't know at the end, and reorderable.
test('Mobile: a saved order comes back with new tabs at the end', async () => {
  await themeStorage.setMany({ [TAB_ORDER_STORAGE_KEY]: JSON.stringify(['specs', 'inventory']), [REORDER_TABS_STORAGE_KEY]: 'true' });
  const tree = await mount();
  expect(tabOrder(tree)).toEqual(['Ficha técnica', 'Estoque', 'Catálogo']);
  expect(tab(tree, 'Catálogo').props.accessibilityActions).toBeDefined();
});

function ReorderSwitch() {
  const { reorderable, setReorderable } = useTabReorder();
  return <Pressable accessibilityLabel="Reordenar" accessibilityRole="switch" onPress={() => setReorderable(!reorderable)} />;
}
