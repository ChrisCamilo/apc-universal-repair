/**
 * @format
 */

import React from 'react';
import { TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { LOGIN_MESSAGES } from '@apc/shared/auth';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { LoginScreen } from '../src/auth/LoginScreen';
import { themeStorage, ThemeProvider } from '../src/theme';

/**
 * Finds a button by the label it shows.
 * @param tree Rendered tree.
 * @param label The button's label.
 * @returns The button's Pressable.
 */
function button(tree: ReactTestRenderer.ReactTestRenderer, label: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.findAll(
    (n) => typeof n.props.style === 'function' && n.findAll((t) => typeof t.type === 'string' && t.props.children === label).length > 0,
  )[0];
}

/**
 * Finds a login field's input by its label.
 * @param tree Rendered tree.
 * @param label The field's label.
 * @returns The TextInput.
 */
function field(tree: ReactTestRenderer.ReactTestRenderer, label: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find((n) => n.type === TextInput && n.props.accessibilityLabel === label);
}

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
 * Presses a button by the label it shows.
 * @param tree Rendered tree.
 * @param label The button's label.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  await ReactTestRenderer.act(async () => button(tree, label).props.onPress?.());
}

/**
 * Tells whether a text shows anywhere in the tree.
 * @param tree Rendered tree.
 * @param text Text to look for.
 * @returns True when a host Text holds it.
 */
function shows(tree: ReactTestRenderer.ReactTestRenderer, text: string): boolean {
  return tree.root.findAll((n) => typeof n.type === 'string' && n.props.children === text).length > 0;
}

/**
 * Types into a login field.
 * @param tree Rendered tree.
 * @param label The field's label.
 * @param text Text to type.
 */
async function type(tree: ReactTestRenderer.ReactTestRenderer, label: string, text: string) {
  await ReactTestRenderer.act(async () => field(tree, label).props.onChangeText(text));
}

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders the login in one style and mode and checks the badge heads it with its needle in the accent, on a
    // panel in the panel color, and "Entrar" is filled with the accent.
    test(`Mobile: the login follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(style, mode, <LoginScreen onSubmit={() => {}} />);
      const header = tree.root.find((n) => n.props.accessibilityRole === 'header' && typeof n.type === 'string');
      expect(header.find((n) => n.props.accessibilityLabel === 'APC Universal Repair' && n.props.viewBox === '0 0 220 180')).toBeDefined();
      expect(tree.root.find((n) => n.props.testID === 'badge-needle').props.stroke).toBe(colors.accent);
      const panels = tree.root.findAll((n) => typeof n.type === 'string' && [n.props.style].flat().some((s) => s?.backgroundColor === colors.panel));
      expect(panels.some((panel) => panel.findAll((n) => n === header).length > 0)).toBe(true);
      expect(button(tree, 'Entrar').props.style({ pressed: false }).backgroundColor).toBe(colors.accent);
    });
  }
}

// Presses "Entrar" with both fields empty, then with only the user, and checks nothing is sent: each empty field
// shows its message, the cursor goes to the first empty one, and a message goes away once its field is typed in.
test('Mobile: empty fields are not sent and the cursor goes to the first one', async () => {
  const onSubmit = jest.fn();
  const focus = jest.spyOn(TextInput.prototype, 'focus');
  const tree = await mount('eighties', 'night', <LoginScreen onSubmit={onSubmit} />);
  await press(tree, 'Entrar');
  expect(shows(tree, LOGIN_MESSAGES.username)).toBe(true);
  expect(shows(tree, LOGIN_MESSAGES.password)).toBe(true);
  expect(focus.mock.contexts.at(-1)).toBe(field(tree, 'Usuário').instance);

  await type(tree, 'Usuário', 'christian.camilo');
  expect(shows(tree, LOGIN_MESSAGES.username)).toBe(false);
  await press(tree, 'Entrar');
  expect(shows(tree, LOGIN_MESSAGES.password)).toBe(true);
  expect(focus.mock.contexts.at(-1)).toBe(field(tree, 'Senha').instance);
  expect(onSubmit).not.toHaveBeenCalled();
  focus.mockRestore();
});

// Fills the user and presses "next", then fills the password and presses "go", and checks "next" moves the cursor
// to the password and "go" sends the login with what was typed.
test('Mobile: the keyboard keys move to the password and send the login', async () => {
  const onSubmit = jest.fn();
  const focus = jest.spyOn(TextInput.prototype, 'focus');
  const tree = await mount('gt4', 'day', <LoginScreen onSubmit={onSubmit} />);
  expect(field(tree, 'Usuário').props.returnKeyType).toBe('next');
  expect(field(tree, 'Senha').props.returnKeyType).toBe('go');
  await type(tree, 'Usuário', 'christian.camilo');
  await ReactTestRenderer.act(async () => field(tree, 'Usuário').props.onSubmitEditing());
  expect(focus.mock.contexts.at(-1)).toBe(field(tree, 'Senha').instance);
  await type(tree, 'Senha', 'opala4100');
  await ReactTestRenderer.act(async () => field(tree, 'Senha').props.onSubmitEditing());
  expect(onSubmit).toHaveBeenCalledWith({ username: 'christian.camilo', password: 'opala4100' });
  focus.mockRestore();
});

// Presses "Esqueceu a senha?" and checks it sends nothing and shows no message, as its dialog comes later.
test('Mobile: the forgotten-password link sends nothing', async () => {
  const onSubmit = jest.fn();
  const tree = await mount('fiat90', 'night', <LoginScreen onSubmit={onSubmit} />);
  await press(tree, 'Esqueceu a senha?');
  expect(onSubmit).not.toHaveBeenCalled();
  expect(shows(tree, LOGIN_MESSAGES.username)).toBe(false);
});
