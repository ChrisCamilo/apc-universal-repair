/**
 * @format
 */

import React from 'react';
import { AccessibilityInfo, StyleSheet, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { cubeIcon, documentIcon, gripIcon, searchIcon } from '@apc/shared/icons';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { Icon } from '../src/Icon';
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

/**
 * Lays the tabs out side by side, 100px wide each, as onLayout would report them, and picks one up with a
 * long press 10px into it, with the list starting 40px from the left of the screen.
 * @param tree Rendered tree.
 * @param label Visible label of the tab to pick up.
 */
async function pickUp(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  const labels = ['Estoque', 'Catálogo', 'Fichas'];
  await ReactTestRenderer.act(async () => {
    labels.forEach((name, i) => tabNamed(tree, name).props.onLayout({ nativeEvent: { layout: { x: i * 100, y: 0, width: 100, height: 40 } } }));
  });
  const x = labels.indexOf(label) * 100;
  await ReactTestRenderer.act(async () => tabNamed(tree, label).props.onLongPress({ nativeEvent: { pageX: 40 + x + 10, locationX: 10 } }));
}

/**
 * Finds the tab list, which follows the finger while a tab is picked up.
 * @param tree Rendered tree.
 * @returns The list's host View.
 */
function tabList(tree: ReactTestRenderer.ReactTestRenderer): ReactTestRenderer.ReactTestInstance {
  return tree.root.find((node) => node.props.accessibilityRole === 'tablist' && typeof node.type === 'string');
}

for (const style of STYLES) {
  for (const mode of MODES) {
    // Picks a tab up and slides it over another in one style and mode, and checks the grips are muted, the
    // tab picked up shows through, and the line where it will land is the accent.
    test(`Mobile: reorderable tabs follow the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(style, mode, <Reorderable />);
      const grips = tree.root.findAllByType(Icon).filter((icon) => icon.props.icon === gripIcon);
      expect(grips.map((grip) => grip.props.color)).toEqual(Array(3).fill(colors.textMuted));
      await pickUp(tree, 'Fichas');
      expect(StyleSheet.flatten(tabNamed(tree, 'Fichas').props.style).opacity).toBeLessThan(1);
      await ReactTestRenderer.act(async () => tabList(tree).props.onResponderMove({ nativeEvent: { pageX: 40 + 15 } }));
      const line = tree.root.find((node) => node.props.testID === 'tab-drop' && typeof node.type === 'string');
      expect(StyleSheet.flatten(line.props.style)).toMatchObject({ backgroundColor: colors.accent, left: 0 });
    });
  }
}

// Renders tabs without the option and checks they have no grip, no long press and no move actions.
test('Mobile: tabs are not reorderable unless asked', async () => {
  const tree = await mount('eighties', 'night', <Reorderable reorderable={false} />);
  expect(tree.root.findAllByType(Icon).filter((icon) => icon.props.icon === gripIcon)).toHaveLength(0);
  expect(tabNamed(tree, 'Estoque').props.onLongPress).toBeUndefined();
  expect(tabNamed(tree, 'Estoque').props.accessibilityActions).toBeUndefined();
});

// Picks the last tab up, slides it over the left half of the first and lets go, and checks it lands before
// it, the owner gets the new order and the new position is announced; a tab picked up and let go without
// sliding goes back to normal.
test('Mobile: a tab picked up and slid lands on the marked side', async () => {
  const onReorder = jest.fn();
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  const tree = await mount('gt4', 'day', <Reorderable onReorder={onReorder} />);
  await pickUp(tree, 'Fichas');
  expect(tabList(tree).props.onMoveShouldSetResponderCapture()).toBe(true);
  expect(tabList(tree).props.onResponderTerminationRequest()).toBe(false);
  await ReactTestRenderer.act(async () => tabList(tree).props.onResponderMove({ nativeEvent: { pageX: 40 + 30 } }));
  await ReactTestRenderer.act(async () => tabList(tree).props.onResponderRelease());
  expect(onReorder).toHaveBeenCalledWith(['specs', 'stock', 'catalog']);
  expect(announce).toHaveBeenCalledWith('Aba Fichas na posição 1 de 3');
  expect(tree.root.findAll((node) => node.props.testID === 'tab-drop')).toHaveLength(0);

  await pickUp(tree, 'Estoque');
  await ReactTestRenderer.act(async () => tabNamed(tree, 'Estoque').props.onPressOut());
  expect(StyleSheet.flatten(tabNamed(tree, 'Estoque').props.style).opacity).toBeUndefined();
  expect(tabList(tree).props.onMoveShouldSetResponderCapture()).toBe(false);
  announce.mockRestore();
});

// Moves a tab with the screen reader actions and checks it moves one place each way, stops at the end, and
// each new position is announced.
test('Mobile: screen reader actions move a tab', async () => {
  const onReorder = jest.fn();
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  const tree = await mount('bmw90', 'night', <Reorderable onReorder={onReorder} />);
  const act = (label: string, actionName: string) =>
    ReactTestRenderer.act(async () => tabNamed(tree, label).props.onAccessibilityAction({ nativeEvent: { actionName } }));
  expect(tabNamed(tree, 'Estoque').props.accessibilityActions.map((a: { label: string }) => a.label)).toEqual([
    'Mover para a esquerda',
    'Mover para a direita',
  ]);
  await act('Estoque', 'moveRight');
  expect(onReorder).toHaveBeenLastCalledWith(['catalog', 'stock', 'specs']);
  expect(announce).toHaveBeenLastCalledWith('Aba Estoque na posição 2 de 3');
  await act('Catálogo', 'moveLeft');
  expect(onReorder).toHaveBeenCalledTimes(1);
  announce.mockRestore();
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

function Reorderable({ reorderable = true, onReorder }: { reorderable?: boolean; onReorder?: (ids: string[]) => void }) {
  const [tab, setTab] = React.useState('stock');
  const [order, setOrder] = React.useState(['stock', 'catalog', 'specs']);
  const all: Record<string, { id: string; label: string; icon: typeof cubeIcon }> = {
    stock: { id: 'stock', label: 'Estoque', icon: cubeIcon },
    catalog: { id: 'catalog', label: 'Catálogo', icon: documentIcon },
    specs: { id: 'specs', label: 'Fichas', icon: searchIcon },
  };
  return (
    <Tabs
      label="Seções do Dashboard"
      tabs={order.map((id) => all[id])}
      selected={tab}
      onSelect={setTab}
      reorderable={reorderable}
      onReorder={(ids) => {
        setOrder(ids);
        onReorder?.(ids);
      }}
    />
  );
}
