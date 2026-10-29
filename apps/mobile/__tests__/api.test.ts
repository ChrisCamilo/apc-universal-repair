import { DEV_SERVER_PORT } from '@apc/shared/server';

/** Babel's transform, typed only as far as these tests use it: the app has no types for @babel/core. */
const { transformSync } = require('@babel/core') as {
  transformSync(code: string, options: object): { code: string } | null;
};

/**
 * Loads src/api.ts afresh on Android, as a development or a release build sees it.
 * @param dev Whether `__DEV__` is on, as in development.
 * @param url The address a release is built with, or undefined for none.
 * @returns The API's address the app uses.
 */
function apiUrl(dev: boolean, url?: string): string {
  const devBefore = (globalThis as { __DEV__?: boolean }).__DEV__;
  (globalThis as { __DEV__?: boolean }).__DEV__ = dev;
  if (url === undefined) {
    delete process.env.APC_API_URL;
  } else {
    process.env.APC_API_URL = url;
  }
  try {
    let found = '';
    jest.isolateModules(() => {
      // The module registry is fresh here, so the app reads this copy of React Native, set to Android.
      jest.replaceProperty(require('react-native').Platform, 'OS', 'android');
      found = require('../src/api').API_URL;
    });
    return found;
  } finally {
    (globalThis as { __DEV__?: boolean }).__DEV__ = devBefore;
    delete process.env.APC_API_URL;
  }
}

/**
 * Runs babel.config.js over a line that reads the release's address.
 * @param url The address in the environment while it runs, or undefined for none.
 * @returns The code Babel gives back.
 */
function bundled(url?: string): string {
  if (url !== undefined) {
    process.env.APC_API_URL = url;
  }
  try {
    return transformSync('export const url = process.env.APC_API_URL;', {
      configFile: './babel.config.js',
      filename: 'api.ts',
      babelrc: false,
    })!.code;
  } finally {
    delete process.env.APC_API_URL;
  }
}

// In development the app talks to the API on the computer's development port, which the Android emulator reaches at
// 10.0.2.2, even when a release address is in the environment.
test('Mobile: uses the computer’s development API in development', () => {
  expect(apiUrl(true, 'http://192.168.0.10:3000')).toBe(`http://10.0.2.2:${DEV_SERVER_PORT}`);
});

// A release build uses the address it was built with, such as the home server's on the shop's Wi-Fi.
test('Mobile: uses the address the release was built with', () => {
  expect(apiUrl(false, 'http://192.168.0.10:3000')).toBe('http://192.168.0.10:3000');
});

// Babel writes the release's address into the bundle, since the phone has no environment to read it from at run
// time, and leaves the code as it is when none is set, as in development.
test('Mobile: writes the release’s API address into the bundle', () => {
  expect(bundled('https://apc.example.com')).toContain('"https://apc.example.com"');
  expect(bundled()).toContain('process.env.APC_API_URL');
});
