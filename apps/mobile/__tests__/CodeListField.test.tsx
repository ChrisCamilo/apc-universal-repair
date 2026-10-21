/**
 * @format
 */

import React, { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { CodeListField } from '../src/inventory/CodeListField';
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
 * Lists the codes the chips show, in order.
 * @param tree Rendered tree.
 * @returns Each chip's code.
 */
function chips(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root
    .findAll((n) => n.type === Text && n.props.testID === 'inventory.code-list-field.frame.chip.code')
    .map((n) => String(n.props.children));
}

/**
 * Finds the field's input.
 * @param tree Rendered tree.
 * @returns The TextInput.
 */
function input(tree: ReactTestRenderer.ReactTestRenderer): ReactTestRenderer.ReactTestInstance {
  return tree.root.findByType(TextInput);
}

/**
 * Types into the field, as the keyboard sends its whole text after each change.
 * @param tree Rendered tree.
 * @param text The field's text after the change.
 */
async function type(tree: ReactTestRenderer.ReactTestRenderer, text: string) {
  await ReactTestRenderer.act(async () => input(tree).props.onChangeText(text));
}

beforeEach(async () => {
  await themeStorage.clear();
});

// Types codes and checks the return key and a comma end one, each joining the list in uppercase, a code the list has
// written otherwise is left out, a paste of several adds them all, and leaving the field keeps what was typed.
test('Mobile: codes join the list as chips with the return key, a comma, a paste or on leaving the field', async () => {
  const tree = await mount('eighties', 'night', <Sample />);
  await type(tree, '5u0 698 151');
  await ReactTestRenderer.act(async () => input(tree).props.onSubmitEditing());
  await type(tree, 'x');
  await type(tree, 'x1');
  await type(tree, 'x1,');
  await type(tree, 'X-1');
  await ReactTestRenderer.act(async () => input(tree).props.onSubmitEditing());
  expect(chips(tree)).toEqual(['5U0 698 151', 'X1']);
  expect(input(tree).props.value).toBe('');
  await type(tree, 'a; b\nc');
  expect(chips(tree)).toEqual(['5U0 698 151', 'X1', 'A', 'B', 'C']);
  await type(tree, 'd');
  await ReactTestRenderer.act(async () => input(tree).props.onBlur());
  expect(chips(tree)).toEqual(['5U0 698 151', 'X1', 'A', 'B', 'C', 'D']);
});

// Takes codes out with a chip's × and with Backspace in the empty field, the last one first.
test("Mobile: a chip's × and Backspace take a code out", async () => {
  const tree = await mount('eighties', 'night', <Sample initial={['A-1', 'B-2', 'C-3']} />);
  await ReactTestRenderer.act(async () => tree.root.find((n) => n.props.accessibilityLabel === 'Remover B-2' && typeof n.props.onPress === 'function').props.onPress());
  expect(chips(tree)).toEqual(['A-1', 'C-3']);
  await ReactTestRenderer.act(async () => input(tree).props.onKeyPress({ nativeEvent: { key: 'Backspace' } }));
  expect(chips(tree)).toEqual(['A-1']);
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Gives a code a message in one style and mode and checks its chip turns to the danger color, the message shows
    // under the field with its code and is read out with the field, and a code without one keeps the text color.
    test(`Mobile: a code with a message shows it in the danger color in ${style}/${mode}`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(style, mode, <Sample initial={['FRA-1000', 'NEW-1']} messages={['Código já usado em “Pastilha”.']} />);
      const [taken, free] = tree.root.findAll((n) => n.type === Text && n.props.testID === 'inventory.code-list-field.frame.chip.code');
      expect(StyleSheet.flatten(taken.props.style).color).toBe(colors.danger);
      expect(StyleSheet.flatten(taken.parent!.props.style).borderColor).toBe(colors.danger);
      expect(StyleSheet.flatten(free.props.style).color).toBe(colors.text);
      const message = tree.root.find((n) => n.type === Text && n.props.testID === 'inventory.code-list-field.messages.message');
      expect(message.props.children).toBe('FRA-1000: Código já usado em “Pastilha”.');
      expect(input(tree).props.accessibilityHint).toBe('FRA-1000: Código já usado em “Pastilha”.');
      expect(tree.root.findAll((n) => n.props.children === 'Os códigos da montadora.')).toHaveLength(0);
    });
  }
}

function Sample({ initial = [], messages }: { initial?: string[]; messages?: (string | undefined)[] }) {
  const [codes, setCodes] = useState(initial);
  return <CodeListField label="Códigos originais" codes={codes} onCodesChange={setCodes} messages={messages} helper="Os códigos da montadora." />;
}
