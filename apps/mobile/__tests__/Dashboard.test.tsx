/**
 * @format
 */

import React from 'react';
import { ScrollView, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { INVENTORY_TUTORIAL_STORAGE_KEY } from '@apc/shared/inventory-tutorial';
import { DASHBOARD_TAB_STORAGE_KEY, DASHBOARD_TABS } from '@apc/shared/tabs';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { Dashboard } from '../src/dashboard/Dashboard';
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
  await themeStorage.setItem(INVENTORY_TUTORIAL_STORAGE_KEY, 'true');
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens the Dashboard in one style and mode and checks the page sits on the canvas, the compact APC mark heads
    // it and the Inventory tab is open, with its search, and selected by default.
    test(`Mobile: the Dashboard opens on the Inventory tab in ${style}/${mode}`, async () => {
      const tree = await mount(style, mode, <Dashboard />);
      const page = tree.root.findAllByType(ScrollView)[0];
      expect([page.props.style].flat().find((s) => s?.backgroundColor)?.backgroundColor).toBe(themes[style][mode].colors.canvas);
      const mark = tree.root.find((n) => n.props.accessibilityLabel === 'APC Universal Repair' && n.props.viewBox !== undefined);
      expect([mark.props.viewBox, mark.props.width]).toEqual(['0 0 48 48', 32]);
      const tabs = tree.root.findAll((n) => n.props.accessibilityRole === 'tab' && typeof n.type === 'string');
      expect(tabs.map((tab) => tab.props.accessibilityState)).toEqual([{ selected: true }, { selected: false }]);
      expect(shows(tree, 'Estoque')).toBe(true);
      expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'Procure pelo nome ou código da peça').length).toBeGreaterThan(0);
    });
  }
}

// Checks the tab bar scrolls sideways when the tabs don't fit, and a stale saved tab falls back to Inventory.
test('Mobile: the tab bar scrolls sideways and a stale saved tab falls back', async () => {
  await themeStorage.setItem(DASHBOARD_TAB_STORAGE_KEY, 'specs');
  const tree = await mount('gt4', 'night', <Dashboard />);
  const bar = tree.root.find((n) => n.props.testID === 'dashboard.dashboard.header.nav' && typeof n.type !== 'string');
  expect(bar.props.horizontal).toBe(true);
  expect(shows(tree, 'Nenhum item cadastrado')).toBe(true);
});

// Checks the user menu slot shows what the Dashboard is given, at the right of the header.
test('Mobile: the user menu slot shows its content', async () => {
  const tree = await mount('eighties', 'day', <Dashboard userMenu={<Text>christian.camilo</Text>} />);
  expect(shows(tree, 'christian.camilo')).toBe(true);
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
