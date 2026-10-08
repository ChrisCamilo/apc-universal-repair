/* eslint-env jest */
// AsyncStorage needs its native module; tests use the in-memory mock the package ships.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

// No API runs during tests: every request answers with an empty inventory unless a test sets its own reply.
global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [], total: 0 }) }));

// The photo library is a native screen; tests pick nothing unless they set their own result.
jest.mock('react-native-image-picker', () => ({ launchImageLibrary: jest.fn(() => Promise.resolve({ didCancel: true })) }));

// The phone's files are a native screen; picking is canceled unless a test answers it.
jest.mock('@react-native-documents/picker', () => ({
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: (error) => typeof error?.code === 'string',
  keepLocalCopy: jest.fn(),
  pick: jest.fn(() => Promise.reject(Object.assign(new Error('canceled'), { code: 'OPERATION_CANCELED' }))),
  types: { csv: ['text/csv'], plainText: 'text/plain' },
}));

// Requests carry React Native's FormData, which takes a file by where it is on the phone, as the app does; Node's
// own FormData would turn it into text.
global.FormData = jest.requireActual('react-native/Libraries/Network/FormData').default;
