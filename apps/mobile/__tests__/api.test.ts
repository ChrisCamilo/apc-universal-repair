import { NativeModules } from 'react-native';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import { DEV_SERVER_PORT } from '@apc/shared/server';
import { apiUrl, applyServer, loadServer, saveServer, SERVER_STORAGE_KEY } from '../src/api';

const STORAGE = createAsyncStorage('apc-universal-repair');
const PAIRING = { url: 'https://192.168.0.10:3000', fingerprint: 'q1Wn7ZbX-0_aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV' };

/**
 * Runs a check as a development build or a release sees it.
 * @param dev Whether `__DEV__` is on, as in development.
 * @param check What to run.
 */
function as(dev: boolean, check: () => void) {
  (globalThis as { __DEV__?: boolean }).__DEV__ = dev;
  try {
    check();
  } finally {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  }
}

beforeEach(async () => {
  await STORAGE.clear();
  applyServer(null);
  (NativeModules.ServerPin.pin as jest.Mock).mockClear();
});

// Before pairing, a development build talks to the computer's development API, which the Android emulator reaches at
// 10.0.2.2, and a release has no API at all; neither pins a certificate.
test('Mobile: with no server paired, development uses the computer’s API and a release none', async () => {
  let devUrl = '';
  jest.isolateModules(() => {
    // The module registry is fresh here, so the app reads this copy of React Native, set to Android.
    jest.replaceProperty(require('react-native').Platform, 'OS', 'android');
    devUrl = require('../src/api').apiUrl();
  });
  expect(devUrl).toBe(`http://10.0.2.2:${DEV_SERVER_PORT}`);

  expect(await loadServer()).toBeNull();
  as(false, () => expect(apiUrl()).toBe(''));
  expect(NativeModules.ServerPin.pin).toHaveBeenLastCalledWith(null, null);
});

// Keeps a server as the pairing does, reads it back as the app does when it starts, and checks its address is the
// API's, in a release and in development, and its host and fingerprint go to the native side, which pins the
// certificate; an IPv6 address goes without its brackets.
test('Mobile: the paired server is kept, and the API and the pinning use it', async () => {
  await saveServer(PAIRING);
  expect(await loadServer()).toEqual(PAIRING);
  as(false, () => expect(apiUrl()).toBe(PAIRING.url));
  expect(apiUrl()).toBe(PAIRING.url);
  expect(NativeModules.ServerPin.pin).toHaveBeenLastCalledWith('192.168.0.10', PAIRING.fingerprint);

  applyServer({ ...PAIRING, url: 'https://[fe80::1]:3000' });
  expect(NativeModules.ServerPin.pin).toHaveBeenLastCalledWith('fe80::1', PAIRING.fingerprint);
  expect(apiUrl()).toBe('https://[fe80::1]:3000');
});

// Finds something kept that isn't a pairing, and checks the phone pairs again rather than failing to start.
test('Mobile: a kept server that can’t be read counts as none', async () => {
  await STORAGE.setItem(SERVER_STORAGE_KEY, '{not json');
  expect(await loadServer()).toBeNull();
  as(false, () => expect(apiUrl()).toBe(''));
});
