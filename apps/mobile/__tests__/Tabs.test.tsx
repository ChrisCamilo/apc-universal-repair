/**
 * @format
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { cubeIcon, documentIcon } from '@apc/shared/icons';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { Tabs, useStoredTab } from '../src/Tabs';
import { themeStorage, ThemeProvider } from '../src/theme';

const IDS = ['stock', 'catalog'] as const;
const STORAGE_KEY = 'apc-tab-test';

/**
 * Saves a style and mode, renders the element inside a ThemeProvider and waits for it and the stored tab
 * to load.
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
 * Finds a tab's Pressable by its label.
 * @param tree Rendered tree.
 * @param label Visible label of the tab.
 * @returns The Pressable test instance.
 */
function tabNamed(tree: ReactTestRenderer.ReactTestRenderer, label: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find(
    (node) =>
      node.props.accessibilityRole === 'tab' &&
      typeof node.type !== 'string' &&
      node.findAll((child) => child.type === Text && child.props.children === label).length > 0,
  );
}

/**
 * Reads the style of the nth Text under a node.
 * @param node Test instance to search in.
 * @param index Which Text to read, in render order.
 * @returns The Text's style.
 */
function textStyle(node: ReactTestRenderer.ReactTestInstance, index = 0) {
  return node.findAllByType(Text)[index].props.style;
}

/**
 * Reads the style of a tab's underline.
 * @param tab The tab's Pressable test instance.
 * @returns The underline's style.
 */
function underlineOf(tab: ReactTestRenderer.ReactTestInstance) {
  return tab.find((node) => node.props.testID === 'tab-underline' && typeof node.type !== 'string').props.style;
}

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders the tabs in one style and mode and checks the selected tab and its count take the accent with
    // an underline that glows only where the style has a glow, while the other tab stays muted.
    test(`Mobile: tabs follow the ${style}/${mode} theme`, async () => {
      const theme = themes[style][mode];
      const tree = await mount(style, mode, <DashboardTabs />);
      const stock = tabNamed(tree, 'Estoque');
      const catalog = tabNamed(tree, 'Catálogo');

      expect(textStyle(stock, 0)).toMatchObject({ color: theme.colors.accent, textTransform: 'uppercase' });
      expect(textStyle(stock, 1)).toMatchObject({ color: theme.colors.accent, borderColor: theme.colors.accent + '73' });
      expect(underlineOf(stock).backgroundColor).toBe(theme.colors.accent);
      expect(underlineOf(stock).shadowColor).toBe(theme.glow ? theme.colors.accent : undefined);
      expect(textStyle(catalog, 0).color).toBe(theme.colors.textMuted);
      expect(underlineOf(catalog).backgroundColor).toBe('transparent');
    });
  }
}

// Checks the roles a screen reader announces, presses the other tab and checks it becomes the selected one;
// pressing an unselected tab shows the text color, like hover on the web.
test('Mobile: pressing a tab selects it', async () => {
  const tree = await mount('eighties', 'night', <DashboardTabs />);
  const list = tree.root.find((node) => node.props.accessibilityRole === 'tablist' && typeof node.type !== 'string');
  expect(list.props.accessibilityLabel).toBe('Seções do Dashboard');
  expect(tabNamed(tree, 'Estoque').props.accessibilityState).toEqual({ selected: true });
  expect(tabNamed(tree, 'Catálogo').props.accessibilityState).toEqual({ selected: false });

  const pressed: React.ReactElement<{ children?: unknown; style: { color: string } }>[] = tabNamed(tree, 'Catálogo').props.children({ pressed: true }).props.children;
  const pressedLabel = pressed.find((child) => child?.props?.children === 'Catálogo')!;
  expect(pressedLabel.props.style.color).toBe(themes.eighties.night.colors.text);

  await ReactTestRenderer.act(async () => tabNamed(tree, 'Catálogo').props.onPress());
  expect(tabNamed(tree, 'Catálogo').props.accessibilityState).toEqual({ selected: true });
  expect(tabNamed(tree, 'Estoque').props.accessibilityState).toEqual({ selected: false });
});

// Picks a tab, mounts again and checks it reopens on that tab; a saved tab that no longer exists falls
// back to the first.
test('Mobile: tabs reopen on the last tab used', async () => {
  const first = await mount('gt4', 'day', <DashboardTabs />);
  await ReactTestRenderer.act(async () => tabNamed(first, 'Catálogo').props.onPress());
  expect(await themeStorage.getItem(STORAGE_KEY)).toBe('catalog');

  const again = await mount('gt4', 'day', <DashboardTabs />);
  expect(tabNamed(again, 'Catálogo').props.accessibilityState).toEqual({ selected: true });

  await themeStorage.setItem(STORAGE_KEY, 'removed');
  const stale = await mount('gt4', 'day', <DashboardTabs />);
  expect(tabNamed(stale, 'Estoque').props.accessibilityState).toEqual({ selected: true });
});

function DashboardTabs() {
  const [tab, setTab] = useStoredTab(STORAGE_KEY, IDS);
  if (!tab) {
    return null;
  }
  return (
    <Tabs
      label="Seções do Dashboard"
      tabs={[
        { id: 'stock', label: 'Estoque', icon: cubeIcon, count: 12 },
        { id: 'catalog', label: 'Catálogo', icon: documentIcon },
      ]}
      selected={tab}
      onSelect={setTab}
    />
  );
}
