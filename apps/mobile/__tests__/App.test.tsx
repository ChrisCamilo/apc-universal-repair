/**
 * @format
 */

import React from 'react';
import { TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { TEST_USERS } from '@apc/shared/test-users';
import App from '../App';

// The safe area waits for the native insets before drawing anything; the package's mock hands them over at once.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

/**
 * Renders the whole app and waits for its providers to load.
 * @returns The rendered tree.
 */
async function mountApp() {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });
  return tree!;
}

// Renders the whole app once to catch crashes on start, such as a missing provider or a broken import.
test('Mobile: app renders without crashing', async () => {
  await mountApp();
});

// Opens the app and checks it starts on the login, then logs in as a test user with the keyboard's "go" key and
// checks the Dashboard takes its place once the AuthService accepts it.
test('Mobile: the app opens on the login and goes on to the Dashboard', async () => {
  const tree = await mountApp();
  const input = (label: string) => tree.root.find((n) => n.type === TextInput && n.props.accessibilityLabel === label);
  const tabs = () => tree.root.findAll((n) => n.props.accessibilityRole === 'tab' && typeof n.type === 'string');
  expect(tabs()).toHaveLength(0);
  await ReactTestRenderer.act(async () => input('Usuário').props.onChangeText(TEST_USERS[0].username));
  await ReactTestRenderer.act(async () => input('Senha').props.onChangeText(TEST_USERS[0].password));
  await ReactTestRenderer.act(async () => input('Senha').props.onSubmitEditing());
  expect(tabs().length).toBeGreaterThan(0);
  expect(tree.root.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === 'Usuário')).toHaveLength(0);
});
