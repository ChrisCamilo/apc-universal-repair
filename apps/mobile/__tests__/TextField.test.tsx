/**
 * @format
 */

import React from 'react';
import { TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { FIELD_KINDS } from '@apc/shared/field';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { SearchField, TextField } from '../src/TextField';
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
 * Reads the flattened style of the nth node with a testID.
 * @param tree Rendered tree.
 * @param testID The testID to look for.
 * @param index Which match to read, in render order.
 * @returns The node's style as one object.
 */
function styleOf(tree: ReactTestRenderer.ReactTestRenderer, testID: string, index = 0) {
  const node = tree.root.findAll((n) => n.props.testID === testID && typeof n.type !== 'string')[index];
  return Object.assign({}, ...[node.props.style].flat());
}

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders a plain field and one with an error in one style and mode, focuses the plain one and
    // checks the hairline, accent and danger frames and the accent focus ring.
    test(`Mobile: fields follow the ${style}/${mode} frame colors`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(
        style,
        mode,
        <>
          <TextField label="Usuário" value="" onValueChange={() => {}} />
          <TextField label="Senha" kind="password" value="" onValueChange={() => {}} error="Senha incorreta" />
        </>,
      );
      expect(styleOf(tree, 'field-frame', 0).borderColor).toBe(colors.hairline);
      expect(styleOf(tree, 'field-frame', 1).borderColor).toBe(colors.danger);

      const [user] = tree.root.findAllByType(TextInput);
      await ReactTestRenderer.act(async () => user.props.onFocus());
      expect(styleOf(tree, 'field-frame', 0).borderColor).toBe(colors.accent);
      expect(styleOf(tree, 'field-ring', 0).borderColor).toBe(colors.accent + '61');
    });
  }
}

// Checks each kind opens the right keyboard with the right autofill hint and capitalization.
test('Mobile: field kinds set the keyboard and autofill', async () => {
  const kinds = ['username', 'password', 'email', 'number', 'decimal'] as const;
  const tree = await mount(
    'eighties',
    'night',
    <>
      {kinds.map((kind) => (
        <TextField key={kind} label={kind} kind={kind} value="" onValueChange={() => {}} />
      ))}
    </>,
  );
  tree.root.findAllByType(TextInput).forEach((input, i) => {
    const spec = FIELD_KINDS[kinds[i]];
    expect(input.props).toMatchObject({
      keyboardType: spec.keyboardType,
      autoComplete: spec.nativeAutoComplete,
      textContentType: spec.textContentType,
      autoCapitalize: spec.autoCapitalize,
    });
  });
});

// Types into a password field, then reveals and hides it with the eye toggle, checking the text is
// hidden by default and the toggle says what it will do.
test('Mobile: password fields hide the text until revealed', async () => {
  const onValueChange = jest.fn();
  const tree = await mount('gt4', 'day', <TextField label="Senha" kind="password" value="" onValueChange={onValueChange} />);
  const input = () => tree.root.findByType(TextInput);
  const toggle = () => tree.root.find((n) => n.props.accessibilityRole === 'button' && typeof n.type !== 'string');

  await ReactTestRenderer.act(async () => input().props.onChangeText('opala4100'));
  expect(onValueChange).toHaveBeenCalledWith('opala4100');
  expect(input().props.secureTextEntry).toBe(true);
  expect(toggle().props.accessibilityLabel).toBe('Mostrar senha');

  await ReactTestRenderer.act(async () => toggle().props.onPress());
  expect(input().props.secureTextEntry).toBe(false);
  expect(toggle().props.accessibilityLabel).toBe('Ocultar senha');
});

// Checks the search shows its clear button only with content and that it empties the search.
test('Mobile: search shows a clear button once there is content', async () => {
  const onValueChange = jest.fn();
  const empty = await mount('eighties', 'night', <SearchField label="Procure marca" value="" onValueChange={onValueChange} />);
  expect(empty.root.findAll((n) => n.props.accessibilityLabel === 'Limpar busca')).toHaveLength(0);

  const filled = await mount('eighties', 'night', <SearchField label="Procure marca" value="Opala" onValueChange={onValueChange} />);
  const clear = filled.root.find((n) => n.props.accessibilityLabel === 'Limpar busca' && typeof n.type !== 'string');
  await ReactTestRenderer.act(async () => clear.props.onPress());
  expect(onValueChange).toHaveBeenCalledWith('');
  expect(filled.root.findByType(TextInput).props.returnKeyType).toBe('search');
});

// Checks a disabled field can't be edited and is dimmed.
test('Mobile: disabled fields are read-only and dimmed', async () => {
  const tree = await mount('eighties', 'day', <TextField label="Usuário" value="christian" onValueChange={() => {}} disabled />);
  expect(tree.root.findByType(TextInput).props.editable).toBe(false);
  expect(tree.root.findAll((n) => n.props.style?.opacity === 0.5).length).toBeGreaterThan(0);
});
