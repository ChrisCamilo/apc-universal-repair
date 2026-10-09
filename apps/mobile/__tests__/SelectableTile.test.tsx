/**
 * @format
 */

import React, { useState } from 'react';
import { Image, StyleSheet, Text, type ViewStyle } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { MODES, scales, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { SelectableTileGroup } from '../src/SelectableTile';
import { themeStorage, ThemeProvider, withAlpha } from '../src/theme';

const BRANDS = ['Chevrolet', 'Volkswagen', 'Fiat'].map((name) => ({ value: name.toLowerCase(), label: name }));

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
 * Finds a tile by its accessible name.
 * @param tree Rendered tree.
 * @param name Brand name.
 * @returns The tile's Pressable.
 */
function tile(tree: ReactTestRenderer.ReactTestRenderer, name: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find((n) => typeof n.props.style === 'function' && n.props.accessibilityLabel === name);
}

/**
 * Reads a tile's frame and its name's style at rest.
 * @param tree Rendered tree.
 * @param name Brand name.
 * @returns The frame style and the name's color.
 */
function look(tree: ReactTestRenderer.ReactTestRenderer, name: string): { frame: ViewStyle; color?: string } {
  const node = tile(tree, name);
  const text = node.findAll((n) => n.type === Text && n.props.children === name)[0];
  return { frame: StyleSheet.flatten(node.props.style({ pressed: false })), color: text && StyleSheet.flatten(text.props.style).color };
}

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders the brand tiles in one style and mode and checks the chosen tile has the accent frame and text
    // over the tinted fill, glowing where the style has a glow, and the others are muted on the raised fill.
    test(`Mobile: brand tiles follow the ${style}/${mode} theme`, async () => {
      const theme = themes[style][mode];
      const { colors } = theme;
      const tree = await mount(style, mode, <Sample />);
      const chosen = look(tree, 'Chevrolet');
      expect(chosen.frame).toMatchObject({ borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, scales.accentSoft) });
      expect(chosen.color).toBe(colors.accent);
      expect(chosen.frame.shadowColor).toBe(theme.glow ? colors.accent : undefined);
      const other = look(tree, 'Fiat');
      expect(other.frame.backgroundColor).toBe(colors.panelRaised);
      expect(other.color).toBe(colors.textMuted);
    });
  }
}

// Checks the tiles are a named radio group with exactly one chosen tile, and pressing another chooses it.
test('Mobile: brand tiles are a radio group with one choice', async () => {
  const tree = await mount('eighties', 'night', <Sample />);
  const group = tree.root.find((n) => n.props.accessibilityRole === 'radiogroup' && typeof n.type === 'string');
  expect(group.props.accessibilityLabel).toBe('Marcas');
  const checked = () => BRANDS.map((b) => tile(tree, b.label).props.accessibilityState.checked);
  expect(checked()).toEqual([true, false, false]);
  await ReactTestRenderer.act(async () => tile(tree, 'Fiat').props.onPress());
  expect(checked()).toEqual([false, false, true]);
});

// Lays four tiles out in two columns and checks they fill two rows, the short row keeping its tiles as wide.
test('Mobile: tiles fill rows of the given columns', async () => {
  const options = [...BRANDS, { value: 'ford', label: 'Ford' }, { value: 'bmw', label: 'BMW' }];
  const tree = await mount('gt4', 'day', <Sample options={options} columns={2} />);
  const group = tree.root.find((n) => n.props.accessibilityRole === 'radiogroup' && typeof n.type === 'string');
  const rows = group.findAll((n) => typeof n.type === 'string' && StyleSheet.flatten(n.props.style)?.flexDirection === 'row');
  const radios = (row: ReactTestRenderer.ReactTestInstance) =>
    row.findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.type === 'string').length;
  expect(rows.map(radios)).toEqual([2, 2, 1]);
  const filler = rows[2].findAll((n) => typeof n.type === 'string' && StyleSheet.flatten(n.props.style)?.flex === 1 && !n.props.accessibilityRole);
  expect(filler).toHaveLength(1);
});

// Gives one brand a logo and another a logo that fails to load, and checks the first shows its logo, the
// second falls back to its name, and a brand with no logo shows its name.
test('Mobile: tiles show the logo, or the name when there is none or it fails', async () => {
  const tree = await mount(
    'fiat90',
    'night',
    <Sample
      options={[
        { value: 'chevrolet', label: 'Chevrolet', logo: 'file:///logos/chevrolet.png' },
        { value: 'bmw', label: 'BMW', logo: 'file:///logos/missing.png' },
        { value: 'fiat', label: 'Fiat' },
      ]}
    />,
  );
  const images = tree.root.findAllByType(Image);
  expect(images.map((image) => image.props.source.uri)).toEqual(['file:///logos/chevrolet.png', 'file:///logos/missing.png']);
  await ReactTestRenderer.act(async () => images[1].props.onError());
  expect(tile(tree, 'BMW').findAllByType(Image)).toHaveLength(0);
  expect(look(tree, 'BMW').color).toBe(themes.fiat90.night.colors.textMuted);
  expect(look(tree, 'Fiat').color).toBeDefined();
  expect(tile(tree, 'Chevrolet').findAllByType(Image)).toHaveLength(1);
});

function Sample({ options = BRANDS, columns }: { options?: { value: string; label: string; logo?: string }[]; columns?: number }) {
  const [brand, setBrand] = useState(options[0].value);
  return <SelectableTileGroup label="Marcas" options={options} value={brand} onValueChange={setBrand} columns={columns} />;
}
