/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { ICON_STROKE, ICONS, searchIcon } from '@apc/shared/icons';
import { THEME_STORAGE_KEYS, themes } from '@apc/shared/theme';
import { Icon } from '../src/Icon';
import { themeStorage, ThemeProvider } from '../src/theme';

/**
 * Renders an element and waits for effects, such as the ThemeProvider loading the saved theme.
 * @param element Element to render.
 * @returns The rendered tree.
 */
async function mount(element: React.ReactElement): Promise<ReactTestRenderer.ReactTestRenderer> {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(element);
  });
  return tree!;
}

beforeEach(async () => {
  await themeStorage.clear();
});

for (const [name, shapes] of Object.entries(ICONS)) {
  // Draws one icon and checks it has exactly the shapes of its shared geometry, at the stroke width
  // every icon uses.
  test(`Mobile: ${name} icon draws its shared shapes`, async () => {
    const tree = await mount(<Icon icon={shapes} />);
    const drawn =
      tree.root.findAllByType(Path).length + tree.root.findAllByType(Circle).length + tree.root.findAllByType(Rect).length;
    expect(drawn).toBe(shapes.length);
    expect(tree.root.findByType(Svg).props.strokeWidth).toBe(ICON_STROKE);
  });
}

// Saves GT4 by day, renders an icon inside the ThemeProvider and checks it strokes with that theme's
// text color, then that a color passed in (the accent) wins.
test('Mobile: icons take the theme text color unless given a token color', async () => {
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: 'gt4', [THEME_STORAGE_KEYS.mode]: 'day' });
  const tree = await mount(
    <ThemeProvider>
      <Icon icon={searchIcon} />
      <Icon icon={searchIcon} color={themes.gt4.day.colors.accent} />
    </ThemeProvider>,
  );
  const [plain, tinted] = tree.root.findAllByType(Svg);
  expect(plain.props.stroke).toBe(themes.gt4.day.colors.text);
  expect(tinted.props.stroke).toBe(themes.gt4.day.colors.accent);
});

// Checks the size prop sets both sides, and that only labeled icons are exposed to screen readers.
test('Mobile: icons size by prop and expose a label only when given one', async () => {
  const tree = await mount(
    <>
      <Icon icon={searchIcon} size={24} />
      <Icon icon={searchIcon} label="Buscar" />
    </>,
  );
  const [decorative, labeled] = tree.root.findAllByType(Svg);
  expect([decorative.props.width, decorative.props.height]).toEqual([24, 24]);
  expect(decorative.props.accessible).toBe(false);
  expect(decorative.props.importantForAccessibility).toBe('no-hide-descendants');
  expect(labeled.props).toMatchObject({ accessible: true, accessibilityRole: 'image', accessibilityLabel: 'Buscar' });
});
