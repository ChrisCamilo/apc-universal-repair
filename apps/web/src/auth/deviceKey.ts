import { DEVICE_KEY_ALGORITHM, signNonce, toBase64url } from '@apc/shared/device-crypto'
import type { DeviceSigner } from '@apc/shared/devices'
import { desktopBridge } from '../desktop/desktopBridge.ts'

// The web app's device key (see @apc/shared/devices). Inside the desktop app it is the main process's, which signs for
// the page through the preload, so the page never sees it. In a browser, as in development, it is a WebCrypto key pair
// whose private key can't be exported, kept in IndexedDB (a CryptoKey is stored as it is, never as bytes) and made on
// the first login. The demo, which has no server, swaps in its own stand-in before it logs in (see
// src/demo/demoDevice.ts).

/** Where the browser's key pair is kept. */
const DATABASE = { name: 'apc-device', store: 'keys', key: 'device' } as const

/** The key signing the logins: the desktop app's, the browser's, or the demo's stand-in. */
let current: DeviceSigner = desktopBridge()?.device ?? browserDevice()

/** The device the logins sign with, whichever key it is. */
export const device: DeviceSigner = {
  publicKey: () => current.publicKey(),
  sign: (nonce) => current.sign(nonce),
}

/**
 * Builds the browser's device key, made on its first use and kept in IndexedDB.
 * @returns The device's key.
 */
function browserDevice(): DeviceSigner {
  let keys: Promise<CryptoKeyPair> | undefined
  /** Reads the key pair kept, or makes and keeps one. */
  const ready = () =>
    (keys ??= keptKeys().then(
      async (kept) => kept ?? (await keepKeys(await crypto.subtle.generateKey(DEVICE_KEY_ALGORITHM, false, ['sign', 'verify']))),
    ))
  return {
    publicKey: async () => toBase64url(await crypto.subtle.exportKey('spki', (await ready()).publicKey)),
    sign: async (nonce) => signNonce((await ready()).privateKey, nonce),
  }
}

/**
 * Keeps the browser's key pair in IndexedDB.
 * @param pair The key pair.
 * @returns The same key pair.
 */
async function keepKeys(pair: CryptoKeyPair): Promise<CryptoKeyPair> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const saving = database.transaction(DATABASE.store, 'readwrite')
    saving.objectStore(DATABASE.store).put(pair, DATABASE.key)
    saving.oncomplete = () => resolve()
    saving.onerror = () => reject(saving.error)
  })
  database.close()
  return pair
}

/**
 * Reads the browser's key pair from IndexedDB.
 * @returns The key pair, or undefined before the first login.
 */
async function keptKeys(): Promise<CryptoKeyPair | undefined> {
  const database = await openDatabase()
  const pair = await new Promise<CryptoKeyPair | undefined>((resolve, reject) => {
    const reading = database.transaction(DATABASE.store).objectStore(DATABASE.store).get(DATABASE.key)
    reading.onsuccess = () => resolve(reading.result as CryptoKeyPair | undefined)
    reading.onerror = () => reject(reading.error)
  })
  database.close()
  return pair
}

/**
 * Opens the IndexedDB database the key pair lives in, making its store the first time.
 * @returns The database.
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(DATABASE.name, 1)
    opening.onupgradeneeded = () => opening.result.createObjectStore(DATABASE.store)
    opening.onsuccess = () => resolve(opening.result)
    opening.onerror = () => reject(opening.error)
  })
}

/**
 * Signs the logins with another key from now on, as the demo does with its stand-in.
 * @param signer The key.
 */
export function replaceDevice(signer: DeviceSigner): void {
  current = signer
}
