/**
 * @format
 */

import React, { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { Stepper } from '../src/ui/Stepper';
import { themeStorage, ThemeProvider } from '../src/app/theme';

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
 * Finds the − or the +.
 * @param tree Rendered tree.
 * @param name "Diminuir" or "Aumentar".
 * @returns Its pressable.
 */
function step(tree: ReactTestRenderer.ReactTestRenderer, name: 'Diminuir' | 'Aumentar') {
  return tree.root.find((n) => n.props.accessibilityLabel === name && typeof n.props.onPress === 'function' && typeof n.props.style === 'function');
}

/**
 * Presses the − or the +.
 * @param tree Rendered tree.
 * @param name "Diminuir" or "Aumentar".
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, name: 'Diminuir' | 'Aumentar') {
  await ReactTestRenderer.act(async () => step(tree, name).props.onPress());
}

/**
 * Reads the number in the field.
 * @param tree Rendered tree.
 * @returns The field's text.
 */
function number(tree: ReactTestRenderer.ReactTestRenderer): string {
  return tree.root.findByType(TextInput).props.value;
}

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders a stepper with an error in one style and mode, and checks the − and + are 48px circles in the field's
    // hairline on the panel, in the accent while pressed, and the number is a 72px pill framed in the danger color, with
    // the error in it too.
    test(`Mobile: a stepper follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(style, mode, <Stepper label="Mínimo" value="9" onValueChange={() => {}} max={5} error="Informe no máximo 5." />);
      for (const name of ['Diminuir', 'Aumentar'] as const) {
        const look = step(tree, name).props.style;
        expect(StyleSheet.flatten(look({ pressed: false }))).toMatchObject({ width: 48, height: 48, borderColor: colors.hairline, backgroundColor: colors.panel });
        expect(StyleSheet.flatten(look({ pressed: true })).borderColor).toBe(colors.accent);
      }
      const input = StyleSheet.flatten(tree.root.findByType(TextInput).props.style);
      expect(input).toMatchObject({ width: 72, height: 48, textAlign: 'center', borderColor: colors.danger });
      const error = tree.root.find((n) => n.type === Text && n.props.children === 'Informe no máximo 5.');
      expect(StyleSheet.flatten(error.props.style).color).toBe(colors.danger);
    });
  }
}

// Presses − and + and types a number, checking each press takes one away or adds one, the − is locked at 0 and the +
// at the limit, and the field still takes what is typed and reads its hint.
test('Mobile: a stepper adds and takes one away, between 0 and its limit', async () => {
  const tree = await mount('eighties', 'night', <Sample />);
  expect(step(tree, 'Diminuir').props.accessibilityState).toEqual({ disabled: true });
  await press(tree, 'Aumentar');
  expect(number(tree)).toBe('1');
  await press(tree, 'Aumentar');
  await press(tree, 'Aumentar');
  expect(number(tree)).toBe('3');
  expect(step(tree, 'Aumentar').props.accessibilityState).toEqual({ disabled: true });
  await press(tree, 'Diminuir');
  expect(number(tree)).toBe('2');
  await ReactTestRenderer.act(async () => tree.root.findByType(TextInput).props.onChangeText('0'));
  expect(step(tree, 'Diminuir').props.accessibilityState).toEqual({ disabled: true });
  expect(tree.root.findByType(TextInput).props).toMatchObject({ accessibilityLabel: 'Mínimo', accessibilityHint: 'Abaixo disso, o estoque fica baixo.' });
});

/** A stepper up to 3 that keeps its own number, starting empty. */
function Sample() {
  const [value, setValue] = useState('');
  return <Stepper label="Mínimo" value={value} onValueChange={setValue} max={3} helper="Abaixo disso, o estoque fica baixo." />;
}
