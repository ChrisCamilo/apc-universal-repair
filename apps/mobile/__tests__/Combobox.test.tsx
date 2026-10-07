/**
 * @format
 */

import React, { useState } from 'react';
import { ScrollView, Text, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { SELECT_VISIBLE_OPTIONS } from '@apc/shared/filters';
import { MODES, scales, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { Combobox } from '../src/Combobox';
import { themeStorage, ThemeProvider } from '../src/theme';

const CATEGORIES = ['Arrefecimento', 'Elétrica', 'Freios', 'Ignição', 'Motor', 'Suspensão', 'Transmissão'];

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
 * Lists the rows of the open list, by their text.
 * @param tree Rendered tree.
 * @returns The text of each row.
 */
function rows(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  const lists = tree.root.findAllByType(ScrollView);
  return lists.length ? lists[0].findAllByType(Text).map((t) => String(t.props.children)) : [];
}

/**
 * Runs a field event inside act.
 * @param tree Rendered tree.
 * @param event Event prop of the TextInput, e.g. "onFocus".
 * @param args Arguments to pass.
 */
async function fire(tree: ReactTestRenderer.ReactTestRenderer, event: string, ...args: unknown[]) {
  await ReactTestRenderer.act(async () => tree.root.findByType(TextInput).props[event](...args));
}

/**
 * Presses the row with a text.
 * @param tree Rendered tree.
 * @param text The row's text.
 */
async function pressRow(tree: ReactTestRenderer.ReactTestRenderer, text: string) {
  const row = tree.root.find(
    (n) => typeof n.props.onPress === 'function' && n.findAll((c) => c.type === Text && c.props.children === text).length > 0,
  );
  await ReactTestRenderer.act(async () => row.props.onPress());
}

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Focuses a field holding an option in one style and mode and checks the frame lights up in the accent and
    // the current option shows in the accent, and that a field with an error has a danger frame.
    test(`Mobile: comboboxes follow the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(style, mode, <Category initial="Freios" />);
      await fire(tree, 'onFocus');
      const frame = tree.root.findAll((n) => n.props.testID === 'combobox-frame' && typeof n.type === 'string')[0];
      expect(frame.props.style.borderColor).toBe(colors.accent);
      const chosen = tree.root.findAllByType(ScrollView)[0].findAllByType(Text).find((t) => t.props.children === 'Freios')!;
      expect([chosen.props.style].flat().find((s) => s?.color)?.color).toBe(colors.accent);

      const failing = await mount(style, mode, <Category initial="" error="Escolha uma categoria da lista ou crie uma nova." />);
      const failingFrame = failing.root.findAll((n) => n.props.testID === 'combobox-frame' && typeof n.type === 'string')[0];
      expect(failingFrame.props.style.borderColor).toBe(colors.danger);
    });
  }
}

// Types a text without accents and checks the list keeps the matching option and offers to create the text,
// then creates a new option and checks it starts with a capital letter and fills the field.
test('Mobile: typing filters the list and offers to create a new option', async () => {
  const onCreate = jest.fn();
  const tree = await mount('eighties', 'night', <Category initial="" onCreated={onCreate} />);
  await fire(tree, 'onFocus');
  await fire(tree, 'onChangeText', 'eletr');
  expect(rows(tree)).toEqual(['Elétrica', '+ Criar categoria “Eletr”']);

  await fire(tree, 'onChangeText', 'escapamento');
  await pressRow(tree, '+ Criar categoria “Escapamento”');
  expect(onCreate).toHaveBeenCalledWith('Escapamento');
  expect(tree.root.findByType(TextInput).props.value).toBe('Escapamento');
  expect(tree.root.findAllByType(ScrollView)).toHaveLength(0);
});

// Leaves the field holding an option in another case and without its accent, and checks it takes the option's
// spelling and the list closes; a new value starts with a capital letter and keeps the rest as typed.
test('Mobile: leaving the field normalizes a known option and closes the list', async () => {
  const tree = await mount('gt4', 'day', <Category initial="" />);
  await fire(tree, 'onFocus');
  await fire(tree, 'onChangeText', 'ELETRICA');
  await fire(tree, 'onBlur');
  expect(tree.root.findByType(TextInput).props.value).toBe('Elétrica');
  expect(tree.root.findAllByType(ScrollView)).toHaveLength(0);
  await fire(tree, 'onChangeText', 'cabos NGK');
  await fire(tree, 'onBlur');
  expect(tree.root.findByType(TextInput).props.value).toBe('Cabos NGK');
});

// Opens the full list with the chevron while the field holds a filtering text, and checks every option is
// there with room for five at a time; an empty list says so.
test('Mobile: the chevron opens the full list, five options at a time', async () => {
  const tree = await mount('eighties', 'day', <Category initial="Mot" />);
  const chevron = tree.root.find((n) => n.props.accessibilityLabel === 'Mostrar categorias' && typeof n.props.onPress === 'function');
  await ReactTestRenderer.act(async () => chevron.props.onPress());
  expect(rows(tree)).toEqual([...CATEGORIES, '+ Criar categoria “Mot”']);
  const list = tree.root.findAllByType(ScrollView)[0];
  expect(Math.floor(list.props.style.maxHeight / scales.space.s7)).toBe(SELECT_VISIBLE_OPTIONS);

  const empty = await mount('eighties', 'day', <Category initial="" options={[]} />);
  await ReactTestRenderer.act(async () => empty.root.findByType(TextInput).props.onFocus());
  expect(rows(empty)).toEqual(['Nenhuma categoria cadastrada']);
});

function Category({
  initial,
  options = CATEGORIES,
  error,
  onCreated,
}: {
  initial: string;
  options?: string[];
  error?: string;
  onCreated?: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const [list, setList] = useState(options);
  return (
    <Combobox
      label="Categoria"
      value={value}
      onValueChange={setValue}
      options={list}
      onCreate={(created) => {
        setList((prev) => [...prev, created]);
        onCreated?.(created);
      }}
      noun="categoria"
      toggleLabel="Mostrar categorias"
      emptyLabel="Nenhuma categoria cadastrada"
      error={error}
    />
  );
}
