/**
 * @format
 */

import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { createMockAuth, REGISTER_MESSAGES, type AuthService, type RegisterResult } from '@apc/shared/auth';
import { isStyleId } from '@apc/shared/style-ids';
import { TEST_USERS } from '@apc/shared/test-users';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { RegisterScreen } from '../src/auth/RegisterScreen';
import { themeStorage, ThemeProvider } from '../src/theme';

// The fields as a new user fills them in, by label.
const NEW_USER = { Nome: 'Ana Souza', Usuário: 'Ana.Souza', 'E-mail': 'ana@oficina.com', Senha: 'freio1234', 'Confirmar senha': 'freio1234' };

/**
 * Builds a sign-up that keeps no session and answers at once, knowing the test users.
 * @returns The AuthService.
 */
function mockAuth(): AuthService {
  return createMockAuth({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }, TEST_USERS, 0);
}

/**
 * Finds the view with a style id.
 * @param tree Rendered tree.
 * @param id The style id, e.g. "auth.register-screen.form".
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
 * Finds a field's input by its label.
 * @param tree Rendered tree.
 * @param label The field's label.
 * @returns The TextInput.
 */
function field(tree: ReactTestRenderer.ReactTestRenderer, label: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find((n) => n.type === TextInput && n.props.accessibilityLabel === label);
}

/**
 * Types every field of the sign-up.
 * @param tree Rendered tree.
 * @param typed The text of each field, by label.
 */
async function fillIn(tree: ReactTestRenderer.ReactTestRenderer, typed: Record<string, string> = NEW_USER) {
  for (const [label, text] of Object.entries(typed)) {
    await ReactTestRenderer.act(async () => field(tree, label).props.onChangeText(text));
  }
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

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders the sign-up in one style and mode and checks the badge heads it, the five fields are labeled, the
    // passwords are hidden and offer to make one up, and "Criar conta" is filled with the accent.
    test(`Mobile: the sign-up follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(style, mode, <RegisterScreen auth={mockAuth()} onRegistered={() => {}} onLogin={() => {}} />);
      expect(byId(tree, 'auth.register-screen.brand.title').props.accessibilityRole).toBe('header');
      for (const label of Object.keys(NEW_USER)) {
        expect(field(tree, label)).toBeDefined();
      }
      for (const label of ['Senha', 'Confirmar senha']) {
        expect(field(tree, label).props.secureTextEntry).toBe(true);
        expect(field(tree, label).props.textContentType).toBe('newPassword');
      }
      expect(StyleSheet.flatten(button(tree, 'Criar conta').props.style({ pressed: false })).backgroundColor).toBe(colors.accent);
    });
  }
}

// Presses "Criar conta" empty, then with a short password typed differently twice, and checks nothing is sent: each
// field that breaks a rule shows its message and the cursor goes to the first.
test('Mobile: a sign-up breaking a rule is not sent and the cursor goes to the first field', async () => {
  const auth = mockAuth();
  const register = jest.spyOn(auth, 'register');
  const focus = jest.spyOn(TextInput.prototype, 'focus');
  const tree = await mount('eighties', 'night', <RegisterScreen auth={auth} onRegistered={() => {}} onLogin={() => {}} />);
  await press(tree, 'Criar conta');
  for (const message of [REGISTER_MESSAGES.displayName, REGISTER_MESSAGES.username, REGISTER_MESSAGES.email, REGISTER_MESSAGES.password, REGISTER_MESSAGES.confirm]) {
    expect(shows(tree, message)).toBe(true);
  }
  expect(focus.mock.contexts.at(-1)).toBe(field(tree, 'Nome').instance);

  await fillIn(tree, { ...NEW_USER, Senha: 'curta', 'Confirmar senha': 'outra' });
  expect(shows(tree, REGISTER_MESSAGES.confirm)).toBe(false);
  await press(tree, 'Criar conta');
  expect(shows(tree, REGISTER_MESSAGES.passwordShort)).toBe(true);
  expect(shows(tree, REGISTER_MESSAGES.confirmMismatch)).toBe(true);
  expect(focus.mock.contexts.at(-1)).toBe(field(tree, 'Senha').instance);
  expect(register).not.toHaveBeenCalled();
  focus.mockRestore();
});

// Fills in a new user, pressing "next" to move between fields and "go" in the last, and checks the sign-up goes to
// the AuthService without the confirmation and hands the new user over.
test('Mobile: the keyboard keys move through the fields and send the sign-up', async () => {
  const auth = mockAuth();
  const register = jest.spyOn(auth, 'register');
  const onRegistered = jest.fn();
  const focus = jest.spyOn(TextInput.prototype, 'focus');
  const tree = await mount('gt4', 'day', <RegisterScreen auth={auth} onRegistered={onRegistered} onLogin={() => {}} />);
  await fillIn(tree);
  const labels = Object.keys(NEW_USER);
  for (const [index, label] of labels.slice(0, -1).entries()) {
    expect(field(tree, label).props.returnKeyType).toBe('next');
    await ReactTestRenderer.act(async () => field(tree, label).props.onSubmitEditing());
    expect(focus.mock.contexts.at(-1)).toBe(field(tree, labels[index + 1]).instance);
  }
  expect(field(tree, 'Confirmar senha').props.returnKeyType).toBe('go');
  await ReactTestRenderer.act(async () => field(tree, 'Confirmar senha').props.onSubmitEditing());
  expect(register).toHaveBeenCalledWith({ displayName: 'Ana Souza', username: 'Ana.Souza', email: 'ana@oficina.com', password: 'freio1234' });
  expect(onRegistered).toHaveBeenCalledWith({ id: 'user-ana.souza', username: 'ana.souza', displayName: 'Ana Souza', initials: 'AS' });
  focus.mockRestore();
});

// Signs up with a test user's username and checks the refusal shows above the form and nobody is handed over.
test('Mobile: a taken username is refused above the form', async () => {
  const onRegistered = jest.fn();
  const tree = await mount('bmw90', 'day', <RegisterScreen auth={mockAuth()} onRegistered={onRegistered} onLogin={() => {}} />);
  await fillIn(tree, { ...NEW_USER, Usuário: TEST_USERS[0].username });
  await press(tree, 'Criar conta');
  const alert = byId(tree, 'auth.register-screen.form.alert');
  expect(alert.props.accessibilityRole).toBe('alert');
  expect(alert.findAll((n) => typeof n.type === 'string' && n.props.children === REGISTER_MESSAGES.taken)).not.toHaveLength(0);
  expect(field(tree, 'Usuário').props.value).toBe(TEST_USERS[0].username);
  expect(onRegistered).not.toHaveBeenCalled();
});

// Holds the sign-up's answer, presses "Criar conta" and the "go" key again meanwhile, and checks it says it is busy
// and the sign-up is sent only once; a failed one says so above the form.
test('Mobile: Criar conta shows it is busy and the sign-up is sent only once', async () => {
  let answer: (result: RegisterResult) => void = () => {};
  const slow: AuthService = { ...mockAuth(), register: jest.fn(() => new Promise<RegisterResult>((resolve) => (answer = resolve))) };
  const tree = await mount('fiat90', 'night', <RegisterScreen auth={slow} onRegistered={() => {}} onLogin={() => {}} />);
  await fillIn(tree);
  // the press starts the sign-up without waiting for its answer, which the test holds
  await ReactTestRenderer.act(async () => {
    button(tree, 'Criar conta').props.onPress();
  });
  expect(button(tree, 'Criar conta').props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  await ReactTestRenderer.act(async () => field(tree, 'Confirmar senha').props.onSubmitEditing());
  expect(slow.register).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => answer({ refused: REGISTER_MESSAGES.failed }));
  expect(shows(tree, REGISTER_MESSAGES.failed)).toBe(true);
  expect(button(tree, 'Criar conta').props.accessibilityState).toMatchObject({ busy: false });
});

// Presses "Já tem conta? Entrar" and checks it asks to go back to the login.
test('Mobile: Já tem conta? Entrar goes back to the login', async () => {
  const onLogin = jest.fn();
  const tree = await mount('gt4', 'night', <RegisterScreen auth={mockAuth()} onRegistered={() => {}} onLogin={onLogin} />);
  await press(tree, 'Já tem conta? Entrar');
  expect(onLogin).toHaveBeenCalledTimes(1);
});

// Checks the parts of the screen carry their style ids, the same as on the web, and that every id on the screen is
// written as the convention asks.
test('Mobile: the sign-up screen carries its style ids', async () => {
  const tree = await mount('gt4', 'night', <RegisterScreen auth={mockAuth()} onRegistered={() => {}} onLogin={() => {}} />);
  for (const id of ['auth.register-screen', 'auth.register-screen.brand.title', 'auth.register-screen.form', 'auth.register-screen.form.actions']) {
    expect(byId(tree, id)).toBeDefined();
  }
  const ids = tree.root.findAll((n) => typeof n.type === 'string' && typeof n.props.testID === 'string').map((n) => n.props.testID);
  expect(ids.filter((id) => id.startsWith('auth.') && !isStyleId(id))).toEqual([]);
});
