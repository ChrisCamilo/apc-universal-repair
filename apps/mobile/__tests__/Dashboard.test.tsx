/**
 * @format
 */

import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { MIN_TOUCH_TARGET } from '@apc/shared/screens';
import { DASHBOARD_TAB_STORAGE_KEY, DASHBOARD_TABS, TAB_ORDER_STORAGE_KEY } from '@apc/shared/tabs';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { Dashboard } from '../src/dashboard/Dashboard';
import { BOTTOM_BAR_HEIGHT } from '../src/dashboard/Dashboard.styles';
import { themeStorage, ThemeProvider } from '../src/theme';

// The first tab still being built, if any.
const WIP_TAB = DASHBOARD_TABS.find((tab) => tab.wip);

/**
 * Saves a style and mode, renders the element inside a ThemeProvider and waits for it, and the saved tab, to load.
 * @param style Style to start on.
 * @param mode Mode to start on.
 * @param element Element to render.
 * @returns The rendered tree.
 */
async function mount(style: Style, mode: Mode, element: React.ReactElement) {
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: style, [THEME_STORAGE_KEYS.mode]: mode });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });
  return tree!;
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
  // The Inventory tutorial counts as seen, so it doesn't start by itself over what the test looks at.
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens the Dashboard in one style and mode and checks the page sits on the canvas and fills the screen without
    // scrolling as a whole, the compact APC mark, hidden from screen readers, beside the open tab's name, which heads
    // it, and the Inventory tab is open, with its search, and selected by default.
    test(`Mobile: the Dashboard opens on the Inventory tab in ${style}/${mode}`, async () => {
      const tree = await mount(style, mode, <Dashboard />);
      const page = tree.root.find((n) => n.props.testID === 'dashboard.dashboard' && typeof n.type !== 'string');
      expect(page.type).not.toBe(ScrollView);
      const pageStyle = StyleSheet.flatten(page.props.style);
      expect([pageStyle.backgroundColor, pageStyle.flex]).toEqual([themes[style][mode].colors.canvas, 1]);
      const mark = tree.root.find((n) => n.props.accessibilityLabel === 'APC Universal Repair' && n.props.viewBox !== undefined);
      expect([mark.props.viewBox, mark.props.width]).toEqual(['0 0 48 48', 32]);
      const hidden = tree.root.find((n) => n.props.testID === 'dashboard.dashboard.header.brand' && typeof n.type === 'string');
      expect(hidden.props.importantForAccessibility).toBe('no-hide-descendants');
      const title = tree.root.find((n) => n.props.testID === 'dashboard.dashboard.header.title' && typeof n.type === 'string');
      expect([title.props.accessibilityRole, title.props.children]).toEqual(['header', 'Estoque']);
      const tabs = tree.root.findAll((n) => n.props.accessibilityRole === 'tab' && typeof n.type === 'string');
      expect(tabs.map((tab) => tab.props.accessibilityState)).toEqual([{ selected: true }, { selected: false }]);
      expect(shows(tree, 'Estoque')).toBe(true);
      expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'Procure pelo nome ou código da peça').length).toBeGreaterThan(0);
    });
  }
}

// With the Catalog saved first in the tab order and a stale saved tab, checks the Dashboard falls back to the Inventory
// and the tabs sit in the bar at the bottom of the screen, 80px tall, in the saved order, each at least 44px, then the
// user menu slot with what the Dashboard is given. Choosing the Catalog in the bar opens it and puts its name on top.
test('Mobile: the tabs sit in the bottom bar in their saved order, then the user menu slot', async () => {
  await themeStorage.setItem(DASHBOARD_TAB_STORAGE_KEY, 'specs');
  await themeStorage.setItem(TAB_ORDER_STORAGE_KEY, JSON.stringify(['catalog', 'inventory']));
  const tree = await mount('gt4', 'night', <Dashboard userMenu={<Text>christian.camilo</Text>} />);
  expect(shows(tree, 'Nenhum item cadastrado')).toBe(true);
  const page = tree.root.find((n) => n.props.testID === 'dashboard.dashboard' && typeof n.type === 'string');
  const bar = tree.root.find((n) => n.props.testID === 'dashboard.bottom-bar' && typeof n.type === 'string');
  expect(page.props.children[page.props.children.length - 1].props.testID).toBe('dashboard.bottom-bar');
  expect(StyleSheet.flatten(bar.props.style).minHeight).toBe(BOTTOM_BAR_HEIGHT);
  const tabs = bar.findAll((n) => n.props.accessibilityRole === 'tab' && typeof n.type === 'string');
  expect(tabs.map((tab) => tab.findAll((n) => n.type === Text).map((n) => n.props.children))).toEqual([['Catálogo'], ['Estoque']]);
  for (const tab of tabs) {
    expect(StyleSheet.flatten(tab.props.style).minHeight).toBe(MIN_TOUCH_TARGET);
  }
  expect(bar.findAll((n) => n.type === Text && n.props.children === 'christian.camilo')).toHaveLength(1);

  const catalog = tree.root.findAll(
    (n) => n.props.accessibilityRole === 'tab' && typeof n.props.onPress === 'function' && n.findAll((c) => c.type === Text && c.props.children === 'Catálogo').length > 0,
  )[0];
  await ReactTestRenderer.act(async () => catalog.props.onPress());
  const title = tree.root.find((n) => n.props.testID === 'dashboard.dashboard.header.title' && typeof n.type === 'string');
  expect(title.props.children).toBe('Catálogo');
});

// Opens the Dashboard on the tab still being built and checks it is read out as "em construção" and opens behind
// the notice naming it, with its screen out of reach. Skipped once no tab is being built.
(WIP_TAB ? test : test.skip)('Mobile: a tab still being built opens behind the work-in-progress notice', async () => {
  await themeStorage.setItem(DASHBOARD_TAB_STORAGE_KEY, WIP_TAB!.id);
  const tree = await mount('fiat90', 'night', <Dashboard />);
  const tab = tree.root.find((n) => n.props.accessibilityRole === 'tab' && n.props.accessibilityLabel === `${WIP_TAB!.label}, em construção`);
  expect(tab.props.accessibilityState).toEqual({ selected: true });
  expect(shows(tree, `A aba ${WIP_TAB!.label} ainda não está pronta`)).toBe(true);
  const content = tree.root.find((n) => n.props.testID === 'common.work-in-progress.content' && typeof n.type === 'string');
  expect(content.props.pointerEvents).toBe('none');
});
