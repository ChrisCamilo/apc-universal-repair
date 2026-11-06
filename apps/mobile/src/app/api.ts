import { NativeModules, Platform } from 'react-native';
import type { Pairing } from '@apc/shared/pairing';
import { DEV_SERVER_PORT } from '@apc/shared/server';
import { themeStorage } from './theme';

// Where the app reaches the API: the home server it paired with on Conectar ao servidor (see ConnectScreen.tsx), over
// HTTPS, trusting only that server's certificate. The pairing is kept on the phone, and handed to the native side
// (ServerPinModule.kt), which pins the certificate for that address on every request, the images' included. A release
// with no pairing yet has no API until one is made; a development build uses the computer's development API, which the
// Android emulator reaches at 10.0.2.2 and the iOS simulator at localhost, unless it paired with a server too.

/** Where the pairing is kept on the phone: the address and the fingerprint, neither of them secret. */
export const SERVER_STORAGE_KEY = 'server.pairing';
/** The computer's development API, which a development build uses with no pairing. */
export const DEV_API_URL = `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:${DEV_SERVER_PORT}`;

/** The native side that pins the paired server's certificate (ServerPinModule.kt). */
const serverPin = NativeModules.ServerPin as { pin: (host: string | null, fingerprint: string | null) => void };

/** The server in use. */
let current: Pairing | null = null;

/**
 * Gives the API's address.
 * @returns The paired server's, e.g. "https://192.168.0.10:3000"; with none, the development API in development, or ''
 * in a release, which answers no request.
 */
export function apiUrl(): string {
  return current?.url ?? (__DEV__ ? DEV_API_URL : '');
}

/**
 * Gives the server in use.
 * @returns The paired server, or null when there is none.
 */
export function currentServer(): Pairing | null {
  return current;
}

/**
 * Reads the server kept on the phone and uses it.
 * @returns The server, or null when the phone hasn't paired with one.
 */
export async function loadServer(): Promise<Pairing | null> {
  const saved = await themeStorage.getItem(SERVER_STORAGE_KEY).catch(() => null);
  let pairing: Pairing | null = null;
  try {
    pairing = saved ? (JSON.parse(saved) as Pairing) : null;
  } catch {
    // Not a pairing: the phone pairs again.
  }
  applyServer(pairing);
  return pairing;
}

/**
 * Keeps the server on the phone, for the next start.
 * @param pairing The server.
 */
export async function saveServer(pairing: Pairing): Promise<void> {
  await themeStorage.setItem(SERVER_STORAGE_KEY, JSON.stringify(pairing));
}

/**
 * Reads a server address's host, as the native side compares it.
 * @param url E.g. "https://192.168.0.10:3000" or "https://[fe80::1]:3000".
 * @returns E.g. "192.168.0.10" or "fe80::1".
 */
export function serverHost(url: string): string {
  return /^https:\/\/(?:\[([^\]]+)\]|([^:/]+))/.exec(url)?.slice(1).find(Boolean) ?? '';
}

/**
 * Uses a server for the API, pinning its certificate, from now on.
 * @param pairing The server, or null for none.
 */
export function applyServer(pairing: Pairing | null): void {
  current = pairing;
  serverPin.pin(pairing && serverHost(pairing.url), pairing?.fingerprint ?? null);
}
