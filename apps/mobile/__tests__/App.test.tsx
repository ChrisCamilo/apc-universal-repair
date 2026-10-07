/**
 * @format
 */

import React from 'react';
import { TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import { initials, SESSION_STORAGE_KEY, type SessionUser } from '@apc/shared/auth';
import { THEME_STORAGE_KEYS } from '@apc/shared/theme';
import { TEST_USERS } from '@apc/shared/test-users';
import App from '../App';
import { auth } from '../src/auth/auth';

// The safe area waits for the native insets before drawing anything; the package's mock hands them over at once.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const STORAGE = createAsyncStorage('apc-universal-repair');
const USER = TEST_USERS[0];

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
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Renders the whole app once to catch crashes on start, such as a missing provider or a broken import.
test('Mobile: app renders without crashing', async () => {
  await mountApp();
});

// Opens the app with no saved session and checks it starts on the login, then logs in as a test user with the
// keyboard's "go" key and checks the Dashboard takes its place once the AuthService accepts it.
test('Mobile: with no session the app opens on the login and goes on to the Dashboard', async () => {
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

// Saves a test user's session, as a previous login would, and checks the app starts straight on the Dashboard,
// with the user menu in its header.
test('Mobile: with a saved session the app opens on the Dashboard', async () => {
  const session = { id: USER.id, username: USER.username, displayName: USER.displayName, initials: initials(USER.displayName) };
  await STORAGE.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  const tree = await mountApp();
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
// login takes the Dashboard's place, the session is gone and the theme stays on the device.
test('Mobile: Sair goes back to the login and keeps the preferences', async () => {
  const session = { id: USER.id, username: USER.username, displayName: USER.displayName, initials: initials(USER.displayName) };
  await STORAGE.setMany({ [SESSION_STORAGE_KEY]: JSON.stringify(session), [THEME_STORAGE_KEYS.style]: 'fiat90' });
  const tree = await mountApp();
  const pressable = (name: string) =>
    tree.root.find((n) => typeof n.type !== 'string' && typeof n.props.onPress === 'function' && n.props.accessibilityLabel === name);
  await ReactTestRenderer.act(async () => pressable('Menu do usuário').props.onPress());
  await ReactTestRenderer.act(async () => pressable('Sair').props.onPress());
  expect(showsLogin(tree)).toBe(true);
  expect(showsDashboard(tree)).toBe(false);
  expect(await STORAGE.getItem(SESSION_STORAGE_KEY)).toBeNull();
  expect(await STORAGE.getItem(THEME_STORAGE_KEYS.style)).toBe('fiat90');
});
