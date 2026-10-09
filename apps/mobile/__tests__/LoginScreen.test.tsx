/**
 * @format
 */

import React from 'react';
import { Modal, StyleSheet, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { createMockAuth, LOGIN_MESSAGES, type AuthService, type SessionUser } from '@apc/shared/auth';
import { isStyleId } from '@apc/shared/style-ids';
import { TEST_USERS } from '@apc/shared/test-users';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { LoginScreen } from '../src/auth/LoginScreen';
import { themeStorage, ThemeProvider } from '../src/theme';

// A login that keeps no session and answers at once.
const AUTH = createMockAuth({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }, TEST_USERS, 0);
const USER = TEST_USERS[0];

/**
 * Finds the view with a style id.
 * @param tree Rendered tree.
 * @param id The style id, e.g. "auth.login-screen.form".
 * @returns The native view that carries it.
 */
function byId(tree: ReactTestRenderer.ReactTestRenderer, id: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find((n) => typeof n.type === 'string' && n.props.testID === id);
}

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
      const tree = await mount(style, mode, <LoginScreen auth={AUTH} onLoggedIn={() => {}} />);
      const header = tree.root.find((n) => n.props.accessibilityRole === 'header' && typeof n.type === 'string');
      expect(header.find((n) => n.props.accessibilityLabel === 'APC Universal Repair' && n.props.viewBox === '0 0 220 180')).toBeDefined();
      expect(tree.root.find((n) => n.props.testID === 'common.brand-mark.needle').props.stroke).toBe(colors.accent);
      const panels = tree.root.findAll((n) => typeof n.type === 'string' && [n.props.style].flat().some((s) => s?.backgroundColor === colors.panel));
      expect(panels.some((panel) => panel.findAll((n) => n === header).length > 0)).toBe(true);
      expect(StyleSheet.flatten(button(tree, 'Entrar').props.style({ pressed: false })).backgroundColor).toBe(colors.accent);
    });
  }
}

// Presses "Entrar" with both fields empty, then with only the user, and checks nothing is sent: each empty field
// shows its message, the cursor goes to the first empty one, and a message goes away once its field is typed in.
test('Mobile: empty fields are not sent and the cursor goes to the first one', async () => {
  const login = jest.spyOn(AUTH, 'login');
  const focus = jest.spyOn(TextInput.prototype, 'focus');
  const tree = await mount('eighties', 'night', <LoginScreen auth={AUTH} onLoggedIn={() => {}} />);
  await press(tree, 'Entrar');
  expect(shows(tree, LOGIN_MESSAGES.username)).toBe(true);
  expect(shows(tree, LOGIN_MESSAGES.password)).toBe(true);
  expect(focus.mock.contexts.at(-1)).toBe(field(tree, 'Usuário').instance);

  await type(tree, 'Usuário', 'christian.camilo');
  expect(shows(tree, LOGIN_MESSAGES.username)).toBe(false);
  await press(tree, 'Entrar');
  expect(shows(tree, LOGIN_MESSAGES.password)).toBe(true);
  expect(focus.mock.contexts.at(-1)).toBe(field(tree, 'Senha').instance);
  expect(login).not.toHaveBeenCalled();
  login.mockRestore();
  focus.mockRestore();
});

// Fills in a test user, pressing "next" after the user and "go" after the password, and checks "next" moves the
// cursor to the password and "go" sends the login, which, accepted, hands the user over.
test('Mobile: the keyboard keys move to the password and send the login', async () => {
  const onLoggedIn = jest.fn();
  const focus = jest.spyOn(TextInput.prototype, 'focus');
  const tree = await mount('gt4', 'day', <LoginScreen auth={AUTH} onLoggedIn={onLoggedIn} />);
  expect(field(tree, 'Usuário').props.returnKeyType).toBe('next');
  expect(field(tree, 'Senha').props.returnKeyType).toBe('go');
  await type(tree, 'Usuário', USER.username);
  await ReactTestRenderer.act(async () => field(tree, 'Usuário').props.onSubmitEditing());
  expect(focus.mock.contexts.at(-1)).toBe(field(tree, 'Senha').instance);
  await type(tree, 'Senha', USER.password);
  await ReactTestRenderer.act(async () => field(tree, 'Senha').props.onSubmitEditing());
  expect(onLoggedIn).toHaveBeenCalledWith(expect.objectContaining({ username: USER.username, initials: 'CC' }));
  focus.mockRestore();
});

// Sends a wrong password and checks one message shows above the form without blaming a field, the password is
// emptied and focused, and nothing is handed over.
test('Mobile: a refused login says so above the form and empties the password', async () => {
  const onLoggedIn = jest.fn();
  const focus = jest.spyOn(TextInput.prototype, 'focus');
  const tree = await mount('bmw90', 'day', <LoginScreen auth={AUTH} onLoggedIn={onLoggedIn} />);
  await type(tree, 'Usuário', USER.username);
  await type(tree, 'Senha', 'errada');
  await press(tree, 'Entrar');
  const alert = byId(tree, 'auth.login-screen.form.alert');
  expect(alert.props.accessibilityRole).toBe('alert');
  expect(alert.findAll((n) => typeof n.type === 'string' && n.props.children === LOGIN_MESSAGES.failed)).not.toHaveLength(0);
  expect(field(tree, 'Senha').props.value).toBe('');
  expect(field(tree, 'Usuário').props.value).toBe(USER.username);
  expect(focus.mock.contexts.at(-1)).toBe(field(tree, 'Senha').instance);
  expect(onLoggedIn).not.toHaveBeenCalled();
  focus.mockRestore();
});

// Checks the parts of the screen carry their style ids, the same as on the web: the page, the badge's heading, the
// form and its actions, each on its own view; and that every id on the screen is written as the convention asks.
test('Mobile: the login screen carries its style ids', async () => {
  const tree = await mount('gt4', 'night', <LoginScreen auth={AUTH} onLoggedIn={() => {}} />);
  for (const id of ['auth.login-screen', 'auth.login-screen.brand.title', 'auth.login-screen.form', 'auth.login-screen.form.actions']) {
    expect(byId(tree, id)).toBeDefined();
  }
  expect(byId(tree, 'auth.login-screen.brand.title').props.accessibilityRole).toBe('header');
  const actions = byId(tree, 'auth.login-screen.form.actions');
  expect(actions.findAll((n) => typeof n.type === 'string' && n.props.children === 'Entrar')).not.toHaveLength(0);
  const ids = tree.root.findAll((n) => typeof n.type === 'string' && typeof n.props.testID === 'string').map((n) => n.props.testID);
  expect(ids.filter((id) => id.startsWith('auth.') && !isStyleId(id))).toEqual([]);
});

// Holds the login's answer, presses "Entrar" and the "go" key again meanwhile, and checks "Entrar" says it is busy
// and the login is sent only once.
test('Mobile: Entrar shows it is busy and the login is sent only once', async () => {
  let answer: (user: SessionUser | null) => void = () => {};
  const slow: AuthService = { ...AUTH, login: jest.fn(() => new Promise<SessionUser | null>((resolve) => (answer = resolve))) };
  const tree = await mount('eighties', 'day', <LoginScreen auth={slow} onLoggedIn={() => {}} />);
  await type(tree, 'Usuário', USER.username);
  await type(tree, 'Senha', USER.password);
  // the press starts the login without waiting for its answer, which the test holds
  await ReactTestRenderer.act(async () => {
    button(tree, 'Entrar').props.onPress();
  });
  expect(button(tree, 'Entrar').props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  await ReactTestRenderer.act(async () => field(tree, 'Senha').props.onSubmitEditing());
  expect(slow.login).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => answer(null));
  expect(button(tree, 'Entrar').props.accessibilityState).toMatchObject({ busy: false });
});

// Opens "Esqueceu a senha?" three times and closes the notice with "Entendi", the back button and a tap outside,
// and checks it asks for the workshop's admin and sends no login.
test('Mobile: the forgotten-password notice says whom to ask and closes three ways', async () => {
  const login = jest.spyOn(AUTH, 'login');
  const tree = await mount('fiat90', 'night', <LoginScreen auth={AUTH} onLoggedIn={() => {}} />);
  const notice = () => tree.root.findByType(Modal);

  await press(tree, 'Esqueceu a senha?');
  expect(notice().props.visible).toBe(true);
  expect(shows(tree, LOGIN_MESSAGES.forgotPassword)).toBe(true);
  await press(tree, 'Entendi');
  expect(notice().props.visible).toBe(false);

  await press(tree, 'Esqueceu a senha?');
  await ReactTestRenderer.act(async () => notice().props.onRequestClose());
  expect(notice().props.visible).toBe(false);

  await press(tree, 'Esqueceu a senha?');
  const outside = tree.root.find((n) => n.props.testID === 'dialog-outside' && typeof n.props.onPress === 'function');
  await ReactTestRenderer.act(async () => outside.props.onPress());
  expect(notice().props.visible).toBe(false);
  expect(login).not.toHaveBeenCalled();
  login.mockRestore();
});
