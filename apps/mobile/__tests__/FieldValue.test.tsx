/**
 * @format
 */

import React from 'react';
import { Text, View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { MODES, scales, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { FieldValue } from '../src/FieldValue';
import { TextField } from '../src/TextField';
import { themeStorage, ThemeProvider, withAlpha } from '../src/theme';

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
    // Shows a value in one style and mode and checks it reads as text: the text color on no fill, inside the soft
    // hairline, with the pill corners of the fields.
    test(`Mobile: field values follow the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(style, mode, <FieldValue label="Nome" value="Filtro de óleo" />);
      const frame = tree.root.find((n) => n.type === View && n.props.testID === 'common.field-value.value').props.style;
      expect(frame).toMatchObject({
        backgroundColor: 'transparent',
        borderColor: withAlpha(colors.hairline, scales.hairlineSoft),
        borderRadius: scales.radiusPill,
      });
      expect(tree.root.findByProps({ children: 'Filtro de óleo' }).props.style.color).toBe(colors.text);
    });
  }
}

// Shows a value beside a text field and checks it is read out with its label, stays on one line ending in an
// ellipsis, and its frame has the field's padding and border width, so a details view keeps its form's layout.
test('Mobile: a field value is read with its label and framed like a text field', async () => {
  const tree = await mount(
    'eighties',
    'night',
    <>
      <TextField label="Código da peça" value="W 712/95" onValueChange={() => {}} />
      <FieldValue label="Nome" value="Filtro de óleo" />
    </>,
  );
  const value = tree.root.find((n) => n.type === View && n.props.accessibilityLabel === 'Nome: Filtro de óleo');
  expect(value.props.accessible).toBe(true);
  const text = tree.root.find((n) => n.type === Text && n.props.children === 'Filtro de óleo');
  expect(text.props).toMatchObject({ numberOfLines: 1, ellipsizeMode: 'tail' });
  const field = tree.root.find((n) => n.type === View && n.props.testID === 'field-frame').props.style;
  const frame = tree.root.find((n) => n.type === View && n.props.testID === 'common.field-value.value').props.style;
  for (const key of ['paddingHorizontal', 'paddingVertical', 'borderWidth', 'borderRadius'] as const) {
    expect(frame[key]).toBe(field[key]);
  }
});
