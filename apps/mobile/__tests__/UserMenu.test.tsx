/**
 * @format
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import type { SessionUser } from '@apc/shared/auth';
import { REORDER_TABS_STORAGE_KEY } from '@apc/shared/tabs';
import { THEME_STORAGE_KEYS } from '@apc/shared/theme';
import { UserMenu } from '../src/dashboard/UserMenu';
import { themeStorage, ThemeProvider, useTheme } from '../src/theme';

const USER: SessionUser = { id: 'user-christian', username: 'christian.camilo', displayName: 'Christian Camilo', initials: 'CC' };

/**
 * Finds the pressable with an accessible name or visible text.
 * @param tree Rendered tree.
 * @param name Accessibility label, or the text inside.
 * @returns The Pressable test instance.
 */
function byName(tree: ReactTestRenderer.ReactTestRenderer, name: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find(
    (n) =>
      typeof n.type !== 'string' &&
      typeof n.props.onPress === 'function' &&
      n.props.accessibilityRole !== undefined &&
      (n.props.accessibilityLabel === name || n.findAll((c) => c.type === Text && c.props.children === name).length > 0),
  );
}

/**
 * Renders the user menu inside a ThemeProvider, with a readout of the active theme, and opens it.
 * @returns The rendered tree.
 */
async function openMenu() {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <UserMenu user={USER} />
        <ActiveTheme />
      </ThemeProvider>,
    );
  });
  await press(tree!, 'Menu do usuário');
  return tree!;
}

/**
 * Presses the pressable with an accessible name or visible text.
 * @param tree Rendered tree.
 * @param name Accessibility label, or the text inside.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, name: string) {
  const node = byName(tree, name);
  await ReactTestRenderer.act(async () => node.props.onPress());
}

/**
 * Reads the active theme from the readout.
 * @param tree Rendered tree.
 * @returns E.g. "eighties/night".
 */
function readout(tree: ReactTestRenderer.ReactTestRenderer): string {
  return tree.root.find((n) => n.props.testID === 'active-theme' && typeof n.type === 'string').props.children;
}

beforeEach(async () => {
  await themeStorage.clear();
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: 'eighties', [THEME_STORAGE_KEYS.mode]: 'night' });
});

// Opens the menu and checks the header shows the logged user, dark mode is on at night, the theme sits on the
// active style and the tab reorder choice is off until turned on.
test('Mobile: the user menu shows the logged user and the display preferences', async () => {
  const tree = await openMenu();
  expect(tree.root.findAll((n) => n.type === Text && n.props.children === 'Christian Camilo')).not.toHaveLength(0);
  expect(byName(tree, 'Modo escuro').props.accessibilityState).toMatchObject({ checked: true });
  expect(byName(tree, 'Anos 80').props.accessibilityState).toMatchObject({ checked: true });
  expect(byName(tree, 'Arrastar para reordenar').props.accessibilityState).toMatchObject({ checked: false });
});

// Turns dark mode off and picks GT4, and checks each applies to the theme and is saved at once, with the menu still
// open between the two.
test('Mobile: dark mode and the theme apply and are saved at once, keeping the menu open', async () => {
  const tree = await openMenu();
  await press(tree, 'Modo escuro');
  expect(readout(tree)).toBe('eighties/day');
  await press(tree, 'GT4');
  expect(readout(tree)).toBe('gt4/day');
  expect(byName(tree, 'GT4').props.accessibilityState).toMatchObject({ checked: true });
  expect(await themeStorage.getMany([THEME_STORAGE_KEYS.style, THEME_STORAGE_KEYS.mode])).toEqual({
    [THEME_STORAGE_KEYS.style]: 'gt4',
    [THEME_STORAGE_KEYS.mode]: 'day',
  });
});

// Turns tab reordering on and checks it is saved on the device and comes back on when the menu is drawn again.
test('Mobile: the tab reorder choice is saved and comes back', async () => {
  const tree = await openMenu();
  await press(tree, 'Arrastar para reordenar');
  expect(await themeStorage.getItem(REORDER_TABS_STORAGE_KEY)).toBe('true');
  const again = await openMenu();
  expect(byName(again, 'Arrastar para reordenar').props.accessibilityState).toMatchObject({ checked: true });
});

function ActiveTheme() {
  const { style, mode } = useTheme();
  return <Text testID="active-theme">{`${style}/${mode}`}</Text>;
}
