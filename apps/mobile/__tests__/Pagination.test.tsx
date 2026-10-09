/**
 * @format
 */

import React, { useState } from 'react';
import { StyleSheet, Text, type ViewStyle } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { PAGE_SIZES } from '@apc/shared/pagination';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { Pagination } from '../src/Pagination';
import { themeStorage, ThemeProvider } from '../src/theme';

/**
 * Saves a style and mode, renders the element inside a ThemeProvider and waits for it to load them.
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
 * Finds the pressable with an accessible name.
 * @param tree Rendered tree.
 * @param name Accessibility label.
 * @returns The Pressable test instance.
 */
function pressable(tree: ReactTestRenderer.ReactTestRenderer, name: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find(
    (node) => typeof node.type !== 'string' && typeof node.props.onPress === 'function' && node.props.accessibilityLabel === name,
  );
}

/**
 * Presses a node through its onPress handler.
 * @param node Pressable test instance.
 */
async function press(node: ReactTestRenderer.ReactTestInstance) {
  await ReactTestRenderer.act(async () => node.props.onPress());
}

/**
 * Reads the range text, e.g. "1–25 de 64".
 * @param tree Rendered tree.
 * @returns The text.
 */
function range(tree: ReactTestRenderer.ReactTestRenderer): string {
  return String(tree.root.find((node) => node.type === Text && / de \d/.test(String(node.props.children))).props.children);
}

/**
 * Resolves a page button's style, a function of the press state.
 * @param node Pressable test instance.
 * @returns The style object at rest.
 */
function styleOf(node: ReactTestRenderer.ReactTestInstance): ViewStyle {
  return StyleSheet.flatten(node.props.style({ pressed: false }));
}

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders a list in one style and mode and checks the current page fills with the accent in the on-accent
    // color, and the other pages are text on a clear tile.
    test(`Mobile: pagination follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(style, mode, <Sample total={240} />);
      const current = pressable(tree, 'Página 1');
      expect(styleOf(current).backgroundColor).toBe(colors.accent);
      expect(StyleSheet.flatten(current.findByType(Text).props.style).color).toBe(colors.onAccent);
      const other = pressable(tree, 'Página 2');
      expect(styleOf(other).backgroundColor).toBe('transparent');
      expect(StyleSheet.flatten(other.findByType(Text).props.style).color).toBe(colors.text);
    });
  }
}

// Opens the middle of a long list and checks the buttons keep the first and last pages and the neighbors of
// the current one, mark the current page, and hide both ellipses from assistive technology.
test('Mobile: a long list shows the ends and the neighbors of the current page', async () => {
  const tree = await mount('eighties', 'night', <Sample total={240} initialPage={5} />);
  const nav = tree.root.find((node) => typeof node.type === 'string' && node.props.accessibilityLabel === 'Páginas do estoque');
  const buttons = nav.findAll((node) => typeof node.props.style === 'function' && node.props.accessibilityRole === 'button');
  expect(buttons.map((b) => b.props.accessibilityLabel)).toEqual([
    'Página anterior',
    'Página 1',
    'Página 4',
    'Página 5',
    'Página 6',
    'Página 10',
    'Próxima página',
  ]);
  expect(pressable(tree, 'Página 5').props.accessibilityState).toEqual({ selected: true, disabled: false });
  expect(nav.findAll((node) => typeof node.type === 'string' && node.props.accessibilityElementsHidden)).toHaveLength(2);
});

// Moves through a short list with next, a page button and previous, and checks the range follows in a live
// region, and previous and next are disabled at the ends.
test('Mobile: previous, next and the page buttons move through the list', async () => {
  const tree = await mount('gt4', 'day', <Sample total={64} />);
  expect(range(tree)).toBe('1–25 de 64');
  expect(tree.root.findAll((node) => node.props.accessibilityLiveRegion === 'polite').length).toBeGreaterThan(0);
  expect(pressable(tree, 'Página anterior').props.disabled).toBe(true);

  await press(pressable(tree, 'Próxima página'));
  expect(range(tree)).toBe('26–50 de 64');
  await press(pressable(tree, 'Página 3'));
  expect(range(tree)).toBe('51–64 de 64');
  expect(pressable(tree, 'Próxima página').props.disabled).toBe(true);
  expect(styleOf(pressable(tree, 'Próxima página')).opacity).toBeLessThan(1);

  await press(pressable(tree, 'Página anterior'));
  expect(range(tree)).toBe('26–50 de 64');
  expect(pressable(tree, 'Página anterior').props.disabled).toBe(false);
});

// Picks a bigger page size on the third page and checks the page moves to the one still holding the first
// item that was showing; an empty list shows no pagination.
test('Mobile: changing the page size keeps the first item in view', async () => {
  const onPageSizeChange = jest.fn();
  const tree = await mount('eighties', 'day', <Sample total={240} initialPage={3} onPageSizeChange={onPageSizeChange} />);
  expect(range(tree)).toBe('51–75 de 240');
  await press(pressable(tree, '50'));
  expect(onPageSizeChange).toHaveBeenCalledWith(50);
  expect(pressable(tree, '50').props.accessibilityState).toEqual({ checked: true });
  expect(range(tree)).toBe('51–100 de 240');
  expect(pressable(tree, 'Página 2').props.accessibilityState.selected).toBe(true);

  const empty = await mount('eighties', 'day', <Sample total={0} />);
  expect(empty.toJSON()).toBeNull();
});

function Sample({
  total,
  initialPage = 1,
  onPageSizeChange,
}: {
  total: number;
  initialPage?: number;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  return (
    <Pagination
      label="Páginas do estoque"
      page={page}
      pageSize={pageSize}
      total={total}
      pageSizes={PAGE_SIZES}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        onPageSizeChange?.(size);
      }}
    />
  );
}
