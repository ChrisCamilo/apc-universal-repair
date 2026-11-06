/**
 * @format
 */

import React from 'react';
import { NativeModules, Text, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { CodeScanner } from 'react-native-vision-camera-barcode-scanner';
import { initials, SESSION_STORAGE_KEY } from '@apc/shared/auth';
import { pairingLink } from '@apc/shared/pairing';
import { TEST_USERS } from '@apc/shared/test-users';
import App from '../App';
import { applyServer, SERVER_STORAGE_KEY } from '../src/app/api';

// The app while pairing is the login (PASSWORD_LOGIN off, see src/auth/passwordLogin.ts): it opens on Conectar ao
// servidor, whose QR code from the computer logs the phone in; App.test.tsx covers the password login set aside.

// The safe area waits for the native insets before drawing anything; the package's mock hands them over at once.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const STORAGE = createAsyncStorage('apc-universal-repair');
const USER = TEST_USERS[0];
/** The user as the API answers the entry with, and the token of their session. */
const LOGGED_IN = { id: USER.id, username: USER.username, displayName: USER.displayName, initials: initials(USER.displayName), inventoryTutorialSeen: true };
/** The home server, as the Servidor dialog's QR code carries it, with the entry code. */
const SERVER = { url: 'https://192.168.0.10:3000', fingerprint: 'q1Wn7ZbX-0_aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV' };
// The setup's fetch, put back after each test that stands in for the API.
const SETUP_FETCH = globalThis.fetch;

/**
 * Answers the server's /health, the challenge and the entry with the test user and the token t1, and anything else as
 * the setup's fetch does.
 * @returns The stand-in, to check what was sent.
 */
function serveEntry() {
  const answer = (status: number, body: unknown) => Promise.resolve({ ok: status < 300, status, json: () => Promise.resolve(body) } as Response);
  const stand = jest.fn((url: RequestInfo, init?: RequestInit) => {
    const address = String(url);
    return address.endsWith('/health')
      ? answer(200, { status: 'ok' })
      : address.endsWith('/devices/challenge')
        ? answer(200, { nonce: 'n1' })
        : address.endsWith('/sessions/pairing')
          ? answer(200, { ...LOGGED_IN, token: 't1' })
          : SETUP_FETCH(url, init);
  });
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
 * Hands the camera's scanner a code it read.
 * @param text What the code holds.
 */
async function scan(text: string) {
  const { onBarcodeScanned } = (CodeScanner as unknown as jest.Mock).mock.calls.at(-1)[0];
  await ReactTestRenderer.act(async () => onBarcodeScanned([{ rawValue: text }]));
}

/**
 * Tells whether Conectar ao servidor shows, by its title.
 * @param tree Rendered tree.
 * @returns True when it is on screen.
 */
function showsConnect(tree: ReactTestRenderer.ReactTestRenderer): boolean {
  return tree.root.findAll((n) => n.props.testID === 'auth.connect-screen.heading.title.text' && typeof n.type === 'string').length > 0;
}

/**
 * Tells whether the Dashboard shows, by its tabs.
 * @param tree Rendered tree.
 * @returns True when the Dashboard's tabs are on screen.
 */
function showsDashboard(tree: ReactTestRenderer.ReactTestRenderer): boolean {
  return tree.root.findAll((n) => n.props.accessibilityRole === 'tab' && typeof n.type === 'string').length > 0;
}

beforeEach(async () => {
  await STORAGE.clear();
  (Keychain as unknown as { clear: () => void }).clear();
  applyServer(null);
  (CodeScanner as unknown as jest.Mock).mockClear();
});

afterEach(() => {
  globalThis.fetch = SETUP_FETCH;
});

// Opens the app with no session and checks it starts on Conectar ao servidor, with no login, sign-up or way back;
// reads the computer's QR code and checks the phone logs in with its entry code and the device's proof, keeps the
// server and its session, and goes on to the Dashboard.
test('Mobile: with no session the app opens on the QR code, which logs the phone in', async () => {
  const api = serveEntry();
  const tree = await mountApp();
  expect(showsConnect(tree)).toBe(true);
  expect(tree.root.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === 'Usuário')).toHaveLength(0);
  expect(tree.root.findAll((n) => n.props.testID === 'common.back-button')).toHaveLength(0);

  await scan(pairingLink({ ...SERVER, entry: 'K7Q2ZD9M' }));
  const entry = api.mock.calls.find(([url]) => String(url) === `${SERVER.url}/sessions/pairing`)!;
  expect(JSON.parse(String(entry[1]!.body))).toEqual({ code: 'K7Q2ZD9M', device: { publicKey: 'pk-test', nonce: 'n1', signature: 'sig-n1' } });
  expect(NativeModules.ServerPin.pin).toHaveBeenLastCalledWith('192.168.0.10', SERVER.fingerprint);
  expect(showsDashboard(tree)).toBe(true);
  const saved = await Keychain.getGenericPassword({ service: SESSION_STORAGE_KEY });
  expect(saved && JSON.parse(saved.password).token).toBe('t1');
  expect(JSON.parse((await STORAGE.getItem(SERVER_STORAGE_KEY))!)).toEqual(SERVER);
  await ReactTestRenderer.act(async () => tree.unmount());
});

// Starts on the Dashboard with a saved session, picks "Sair" in the user menu, and checks Conectar ao servidor takes
// its place, with no way back; then that an expired session goes there too, saying so until a code is read.
test('Mobile: Sair and an expired session go back to the QR code', async () => {
  const session = JSON.stringify({ ...LOGGED_IN, token: 't1' });
  await Keychain.setGenericPassword('session', session, { service: SESSION_STORAGE_KEY });
  const tree = await mountApp();
  const pressable = (name: string) =>
    tree.root.find((n) => typeof n.type !== 'string' && typeof n.props.onPress === 'function' && n.props.accessibilityLabel === name);
  await ReactTestRenderer.act(async () => pressable('Conta').props.onPress());
  await ReactTestRenderer.act(async () => pressable('Sair').props.onPress());
  expect(showsConnect(tree)).toBe(true);
  expect(tree.root.findAll((n) => n.props.testID === 'common.back-button')).toHaveLength(0);
  await ReactTestRenderer.act(async () => tree.unmount());

  await Keychain.setGenericPassword('session', session, { service: SESSION_STORAGE_KEY });
  globalThis.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) } as Response)) as typeof fetch;
  const expired = await mountApp();
  const says = (text: string) => expired.root.findAll((n) => n.type === Text && n.props.children === text).length > 0;
  expect(showsConnect(expired)).toBe(true);
  expect(says('Sua sessão expirou. Leia o código do computador de novo.')).toBe(true);
  serveEntry();
  await scan(pairingLink({ ...SERVER, entry: 'K7Q2ZD9M' }));
  expect(showsDashboard(expired)).toBe(true);
  await ReactTestRenderer.act(async () => expired.unmount());
});
