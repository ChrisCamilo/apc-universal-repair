/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native-svg';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { BrandMark } from '../src/BrandMark';
import { fontFamily, themeStorage, ThemeProvider } from '../src/theme';

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

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders the badge in one style and mode and checks its needle takes the accent, "APC" the text color in the
    // style's display face, and "UNIVERSAL REPAIR" the muted color, so the mark follows the active theme.
    test(`Mobile: the brand badge follows the ${style}/${mode} theme`, async () => {
      const theme = themes[style][mode];
      const tree = await mount(style, mode, <BrandMark />);
      const needle = tree.root.find((n) => n.props.testID === 'badge-needle');
      expect(needle.props.stroke).toBe(theme.colors.accent);
      const [name, tagline] = tree.root.findAllByType(Text);
      expect(name.props).toMatchObject({ fill: theme.colors.text, fontFamily: fontFamily(theme.displayFont, 700) });
      expect(name.props.children).toBe('APC');
      expect(tagline.props.fill).toBe(theme.colors.textMuted);
      expect(tagline.props.children).toBe('UNIVERSAL REPAIR');
    });
  }
}

// Renders the badge and the compact mark and checks both are one image named after the brand, the badge keeping
// its 11:9 ratio at the given width and the compact mark square.
test('Mobile: the badge keeps its ratio and the compact mark is square', async () => {
  const tree = await mount(
    'gt4',
    'day',
    <>
      <BrandMark size={220} />
      <BrandMark variant="compact" size={32} />
    </>,
  );
  const marks = tree.root.findAll((n) => n.props.accessibilityLabel === 'APC Universal Repair' && n.props.viewBox !== undefined);
  expect(marks.map((mark) => [mark.props.width, mark.props.height])).toEqual([
    [220, 180],
    [32, 32],
  ]);
  expect(marks.every((mark) => mark.props.accessibilityRole === 'image')).toBe(true);
});
