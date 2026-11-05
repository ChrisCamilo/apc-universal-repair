/* eslint-env jest */
// AsyncStorage needs its native module; tests use the in-memory mock the package ships.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

// The keychain is native; tests keep its values in memory, one per service, which clear() empties.
jest.mock('react-native-keychain', () => {
  const saved = new Map();
  return {
    clear: () => saved.clear(),
    getGenericPassword: jest.fn(async ({ service }) => (saved.has(service) ? { service, username: 'session', password: saved.get(service) } : false)),
    resetGenericPassword: jest.fn(async ({ service }) => saved.delete(service)),
    setGenericPassword: jest.fn(async (username, password, { service }) => {
      saved.set(service, password);
      return { service, storage: 'memory' };
    }),
  };
});

// No API runs during tests: every request answers with an empty inventory unless a test sets its own reply.
global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [], total: 0 }) }));

// The photo library is a native screen; tests pick nothing unless they set their own result.
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(() => Promise.resolve({ didCancel: true })),
  launchImageLibrary: jest.fn(() => Promise.resolve({ didCancel: true })),
}));

// The phone's files are a native screen; picking is canceled unless a test answers it.
jest.mock('@react-native-documents/picker', () => ({
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: (error) => typeof error?.code === 'string',
  keepLocalCopy: jest.fn(),
  pick: jest.fn(() => Promise.reject(Object.assign(new Error('canceled'), { code: 'OPERATION_CANCELED' }))),
  types: { csv: ['text/csv'], plainText: 'text/plain' },
}));

// The native side that pins the paired server's certificate (ServerPinModule.kt); tests check what it is handed.
require('react-native').NativeModules.ServerPin = { pin: jest.fn() };

// The device key is the Android Keystore's; tests get a fixed public key, and a "signature" that names the nonce.
require('react-native').NativeModules.DeviceKey = { publicKey: jest.fn(async () => 'pk-test'), sign: jest.fn(async (nonce) => `sig-${nonce}`) };

// The camera is native: the scanner draws nothing and reads no code unless a test calls its onBarcodeScanned, and
// the camera's permission is granted.
jest.mock('react-native-vision-camera', () => ({
  useCameraDevice: jest.fn(() => ({ id: 'back' })),
  useCameraPermission: jest.fn(() => ({ status: 'authorized', hasPermission: true, canRequestPermission: false, requestPermission: jest.fn(async () => true) })),
}));
jest.mock('react-native-vision-camera-barcode-scanner', () => ({
  CodeScanner: jest.fn(() => null),
}));

// Requests carry React Native's FormData, which takes a file by where it is on the phone, as the app does; Node's
// own FormData would turn it into text.
global.FormData = jest.requireActual('react-native/Libraries/Network/FormData').default;

// Every test starts with the phone's reduced motion on, so dialogs, menus and lists open and close at once and a test
// reads the screen as it ends up. A plain function, not a mock, so a test that spies on it to turn motion on gets this
// back when it restores the spy.
require('react-native').AccessibilityInfo.isReduceMotionEnabled = () => Promise.resolve(true);
