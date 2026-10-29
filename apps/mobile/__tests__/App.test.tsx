/**
 * @format
 */

import React from 'react';
import { Text, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { initials, LOGIN_MESSAGES, SESSION_STORAGE_KEY, type SessionUser } from '@apc/shared/auth';
import { THEME_STORAGE_KEYS } from '@apc/shared/theme';
import { TEST_USERS } from '@apc/shared/test-users';
import App from '../App';
import { auth } from '../src/auth/auth';

// The safe area waits for the native insets before drawing anything; the package's mock hands them over at once.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const STORAGE = createAsyncStorage('apc-universal-repair');
const USER = TEST_USERS[0];
// The test user's session, as a previous login saves it in the keychain.
const SESSION = { id: USER.id, username: USER.username, displayName: USER.displayName, initials: initials(USER.displayName), token: 't1' };

// The setup's fetch, put back after each test that stands in for the API's login and sign-up.
const SETUP_FETCH = globalThis.fetch;

/**
 * Reads the session saved in the keychain.
 * @returns The saved session, or null.
 */
async function savedSession() {
  const saved = await Keychain.getGenericPassword({ service: SESSION_STORAGE_KEY });
  return saved ? JSON.parse(saved.password) : null;
}

/**
 * Answers the API's login and sign-up with a user and the token t1, and anything else as the setup's fetch does.
 * @param user The user the API answers with.
 * @returns The stand-in, to check what was sent.
 */
function serveUser(user: SessionUser) {
  const stand = jest.fn((url: RequestInfo, init?: RequestInit) =>
    /\/(sessions|users)$/.test(String(url))
      ? Promise.resolve({ ok: true, status: String(url).endsWith('/users') ? 201 : 200, json: () => Promise.resolve({ ...user, token: 't1' }) } as Response)
      : SETUP_FETCH(url, init),
  );
  globalThis.fetch = stand as typeof fetch;
  return stand;
}

/**
 * Renders the whole app and waits for its providers and the saved session to load.
 * @returns The rendered tree.
 */
async function mountApp() {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });
  return tree!;
}

/**
 * Tells whether the Dashboard shows, by its tabs.
 * @param tree Rendered tree.
 * @returns True when the Dashboard's tabs are on screen.
 */
function showsDashboard(tree: ReactTestRenderer.ReactTestRenderer): boolean {
  return tree.root.findAll((n) => n.props.accessibilityRole === 'tab' && typeof n.type === 'string').length > 0;
}

/**
 * Tells whether the login shows, by its user field.
 * @param tree Rendered tree.
 * @returns True when the login's user field is on screen.
 */
function showsLogin(tree: ReactTestRenderer.ReactTestRenderer): boolean {
  return tree.root.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === 'Usuário').length > 0;
}

beforeEach(async () => {
  await STORAGE.clear();
  (Keychain as unknown as { clear: () => void }).clear();
});

afterEach(() => {
  jest.restoreAllMocks();
  globalThis.fetch = SETUP_FETCH;
});

// Renders the whole app once to catch crashes on start, such as a missing provider or a broken import.
test('Mobile: app renders without crashing', async () => {
  await mountApp();
});

// Opens the app with no saved session and checks it starts on the login, then logs in as a test user with the
// keyboard's "go" key and checks the Dashboard takes its place once the AuthService accepts it.
test('Mobile: with no session the app opens on the login and goes on to the Dashboard', async () => {
  serveUser({ id: USER.id, username: USER.username, displayName: USER.displayName, initials: initials(USER.displayName), inventoryTutorialSeen: true });
  const tree = await mountApp();
  const input = (label: string) => tree.root.find((n) => n.type === TextInput && n.props.accessibilityLabel === label);
  expect(showsLogin(tree)).toBe(true);
  expect(showsDashboard(tree)).toBe(false);
  await ReactTestRenderer.act(async () => input('Usuário').props.onChangeText(USER.username));
  await ReactTestRenderer.act(async () => input('Senha').props.onChangeText(USER.password));
  await ReactTestRenderer.act(async () => input('Senha').props.onSubmitEditing());
  expect(showsDashboard(tree)).toBe(true);
  expect(showsLogin(tree)).toBe(false);
});

// Opens the sign-up from the login, goes back and forth, signs up a new user with the keyboard's "go" key in the last
// field and checks the Dashboard takes its place once the API creates them, with the Inventory tutorial starting on
// this first login and marked seen on the API.
test('Mobile: the login leads to the sign-up, which goes on to the Dashboard', async () => {
  const fetch = serveUser({ id: 'u1', username: 'ana.souza', displayName: 'Ana Souza', initials: 'AS', inventoryTutorialSeen: false });
  const tree = await mountApp();
  const input = (label: string) => tree.root.find((n) => n.type === TextInput && n.props.accessibilityLabel === label);
  const pressable = (label: string) =>
    tree.root.findAll(
      (n) =>
        typeof n.props.style === 'function' &&
        (n.props.accessibilityLabel === label || n.findAll((t) => typeof t.type === 'string' && t.props.children === label).length > 0),
    )[0];
  const showsSignUp = () => tree.root.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === 'Confirmar senha').length > 0;
  await ReactTestRenderer.act(async () => pressable('Criar conta').props.onPress());
  expect(showsSignUp()).toBe(true);
  await ReactTestRenderer.act(async () => pressable('Já tem conta? Entrar').props.onPress());
  expect(showsSignUp()).toBe(false);
  expect(showsLogin(tree)).toBe(true);

  await ReactTestRenderer.act(async () => pressable('Criar conta').props.onPress());
  const typed = { Nome: 'Ana Souza', Usuário: 'ana.souza', 'E-mail': 'ana@oficina.com', Senha: 'freio1234', 'Confirmar senha': 'freio1234' };
  for (const [label, text] of Object.entries(typed)) {
    await ReactTestRenderer.act(async () => input(label).props.onChangeText(text));
  }
  await ReactTestRenderer.act(async () => input('Confirmar senha').props.onSubmitEditing());
  expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/users$/), expect.objectContaining({ method: 'POST' }));
  expect(showsDashboard(tree)).toBe(true);
  expect(showsSignUp()).toBe(false);
  expect(tree.root.findAll((n) => n.type === Text && n.props.children === 'Abra o cadastro').length).toBeGreaterThan(0);
  expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/users\/me\/inventory-tutorial$/), expect.objectContaining({ method: 'PUT' }));
  expect(await savedSession()).toMatchObject({ username: 'ana.souza', token: 't1', inventoryTutorialSeen: true });
  // The tutorial's timers stop with the app.
  await ReactTestRenderer.act(async () => tree.unmount());
});

// Saves a test user's session in the keychain, as a previous login would, and checks the app starts straight on the
// Dashboard, with the user menu in its header, and asks the API for the items with the session's token.
test('Mobile: with a saved session the app opens on the Dashboard', async () => {
  await Keychain.setGenericPassword('session', JSON.stringify(SESSION), { service: SESSION_STORAGE_KEY });
  const tree = await mountApp();
  const items = (globalThis.fetch as jest.Mock).mock.calls.find(([url]) => /\/items/.test(String(url)));
  expect(new Headers(items[1].headers).get('Authorization')).toBe('Bearer t1');
  expect(showsDashboard(tree)).toBe(true);
  expect(showsLogin(tree)).toBe(false);
  expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'Menu do usuário' && typeof n.type === 'string')).toHaveLength(1);
});

// Holds the read of the saved session and checks neither the login nor the Dashboard shows meanwhile, so the wrong
// one never flashes; once the read finds nobody, the login shows.
test('Mobile: nothing but the canvas shows while the session is read', async () => {
  let answer: (user: SessionUser | null) => void = () => {};
  jest.spyOn(auth, 'currentUser').mockReturnValue(new Promise((resolve) => (answer = resolve)));
  const tree = await mountApp();
  expect(showsLogin(tree)).toBe(false);
  expect(showsDashboard(tree)).toBe(false);
  await ReactTestRenderer.act(async () => answer(null));
  expect(showsLogin(tree)).toBe(true);
});

// Starts on the Dashboard with a saved session and a saved theme, picks "Sair" in the user menu, and checks the
// login takes the Dashboard's place, the session is ended on the API with its token and gone from the keychain, and
// the theme stays on the device.
test('Mobile: Sair goes back to the login and keeps the preferences', async () => {
  await Keychain.setGenericPassword('session', JSON.stringify(SESSION), { service: SESSION_STORAGE_KEY });
  await STORAGE.setItem(THEME_STORAGE_KEYS.style, 'fiat90');
  const tree = await mountApp();
  const pressable = (name: string) =>
    tree.root.find((n) => typeof n.type !== 'string' && typeof n.props.onPress === 'function' && n.props.accessibilityLabel === name);
  await ReactTestRenderer.act(async () => pressable('Menu do usuário').props.onPress());
  await ReactTestRenderer.act(async () => pressable('Sair').props.onPress());
  expect(showsLogin(tree)).toBe(true);
  expect(showsDashboard(tree)).toBe(false);
  const logout = (globalThis.fetch as jest.Mock).mock.calls.find(([url]) => /\/sessions\/current$/.test(String(url)));
  expect(logout[1].method).toBe('DELETE');
  expect(new Headers(logout[1].headers).get('Authorization')).toBe('Bearer t1');
  expect(await savedSession()).toBeNull();
  expect(await STORAGE.getItem(THEME_STORAGE_KEYS.style)).toBe('fiat90');
});

// Saves a session as an older version did, in AsyncStorage and without a token, and checks the app starts on the
// login, so the user logs in again once.
test('Mobile: a session saved before the token opens on the login', async () => {
  const older = { id: USER.id, username: USER.username, displayName: USER.displayName, initials: initials(USER.displayName) };
  await STORAGE.setItem(SESSION_STORAGE_KEY, JSON.stringify(older));
  await Keychain.setGenericPassword('session', JSON.stringify(older), { service: SESSION_STORAGE_KEY });
  const tree = await mountApp();
  expect(showsLogin(tree)).toBe(true);
});

// Starts on the Dashboard with a saved session whose token the API refuses, and checks the login takes its place,
// saying the session expired, with the session gone from the keychain; logging in again takes the notice away.
test('Mobile: an expired session goes back to the login, which says so', async () => {
  await Keychain.setGenericPassword('session', JSON.stringify(SESSION), { service: SESSION_STORAGE_KEY });
  globalThis.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) } as Response)) as typeof fetch;
  const tree = await mountApp();
  const says = (text: string) => tree.root.findAll((n) => n.type === Text && n.props.children === text).length > 0;
  expect(showsLogin(tree)).toBe(true);
  expect(says(LOGIN_MESSAGES.expired)).toBe(true);
  expect(await savedSession()).toBeNull();

  serveUser({ id: USER.id, username: USER.username, displayName: USER.displayName, initials: initials(USER.displayName), inventoryTutorialSeen: true });
  const input = (label: string) => tree.root.find((n) => n.type === TextInput && n.props.accessibilityLabel === label);
  await ReactTestRenderer.act(async () => input('Usuário').props.onChangeText(USER.username));
  await ReactTestRenderer.act(async () => input('Senha').props.onChangeText(USER.password));
  await ReactTestRenderer.act(async () => input('Senha').props.onSubmitEditing());
  expect(showsDashboard(tree)).toBe(true);
  await ReactTestRenderer.act(async () => tree.unmount());
});
