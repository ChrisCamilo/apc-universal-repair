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

// No API runs during tests: the catalog answers with the catalog a new server starts with, the change feed with an empty
// inventory's full copy, a phone's operations as applied, and every other request with an empty inventory, unless a
// test sets its own reply.
const { TEST_CATALOG_DATA } = require('@apc/domain/test-catalog');
const { syncAnswer } = require('@apc/domain/test-sync');
global.fetch = jest.fn((url, init) => {
  const { pathname, searchParams } = new URL(String(url));
  if (pathname === '/sync/changes') {
    return Promise.resolve(syncAnswer(searchParams, []));
  }
  if (pathname === '/sync/operations') {
    const { operations } = JSON.parse(String(init.body));
    const results = operations.map((operation) => ({ id: operation.id, status: 'applied', statusCode: 200 }));
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results }) });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve(pathname.endsWith('/catalog') ? TEST_CATALOG_DATA : { items: [], total: 0 }) });
});

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

// The inventory's copy is kept encrypted by the native side (InventoryCopyModule.kt); tests keep it in memory, and each
// test starts with none, as after logging out (see jest.afterEnv.js).
const copyFile = { saved: null };
require('react-native').NativeModules.InventoryCopy = {
  read: jest.fn(async () => copyFile.saved),
  write: jest.fn(async (copy) => {
    copyFile.saved = copy;
  }),
  clear: jest.fn(async () => {
    copyFile.saved = null;
  }),
  // The phone's lock opens it at once, as on a phone with none, unless a test answers otherwise.
  unlock: jest.fn(async () => 'open'),
  lock: jest.fn(async () => {}),
  hasLock: jest.fn(async () => true),
  openLockSettings: jest.fn(),
};

// The photos the phone keeps are files the native side downloads (PhotoCacheModule.kt); tests keep each one's address,
// "file:///photos/<kind>/<id>", in memory, as if downloaded at once, and every test starts with none. A photo picked
// is held at "file:///held/<id>" until released.
const photoFiles = { thumb: new Map(), full: new Map(), held: new Map() };
require('react-native').NativeModules.PhotoCache = {
  list: jest.fn(async () => ({ thumb: Object.fromEntries(photoFiles.thumb), full: Object.fromEntries(photoFiles.full) })),
  save: jest.fn(async (kind, id) => {
    photoFiles[kind].set(id, `file:///photos/${kind}/${id}`);
    return `file:///photos/${kind}/${id}`;
  }),
  touch: jest.fn(),
  remove: jest.fn(async (kind, ids) => {
    ids.forEach((id) => photoFiles[kind].delete(id));
  }),
  trim: jest.fn(async () => []),
  hold: jest.fn(async (id, uri) => {
    photoFiles.held.set(id, uri);
    return `file:///held/${id}`;
  }),
  release: jest.fn(async (keep) => {
    [...photoFiles.held.keys()].filter((id) => !keep.includes(id)).forEach((id) => photoFiles.held.delete(id));
  }),
  clear: jest.fn(async () => {
    photoFiles.thumb.clear();
    photoFiles.full.clear();
  }),
};

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
