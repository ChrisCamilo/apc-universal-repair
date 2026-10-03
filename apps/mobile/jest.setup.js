/* eslint-env jest */
// AsyncStorage needs its native module; tests use the in-memory mock the package ships.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

// No API runs during tests: every request answers with an empty inventory unless a test sets its own reply.
global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) }));
