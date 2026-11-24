import { Linking, PermissionsAndroid, Platform } from 'react-native';

// The phone's access to the local network, which Android 17 (API 37) asks the user for before an app reaches a device
// on the Wi-Fi, where the home server is: the app declares ACCESS_LOCAL_NETWORK (AndroidManifest.xml), and without the
// access its connections to the server never get through. Conectar ao servidor asks for it before reaching the server,
// saying why; the copy's sync checks it first (see inventoryCopy.ts), and once it is refused for good only Android's
// settings give it back, which the screens open; Android lists it there as Dispositivos próximos (Nearby devices).
// Earlier Android versions, and iOS, have no such access to ask for.

/** The first Android API that asks for the local network: Android 17. */
const ASKS_FROM_API = 37;
const PERMISSION = PermissionsAndroid.PERMISSIONS.ACCESS_LOCAL_NETWORK;

/** The access asked for: given, refused this time, or refused for good, so only Android's settings give it back. */
export type LocalNetworkAccess = 'granted' | 'denied' | 'blocked';

/** What the screens say of the access, in Portuguese. */
export const LOCAL_NETWORK_TEXTS = {
  why: 'O servidor fica no computador de casa, na mesma rede Wi-Fi: para chegar até ele, o Android vai pedir que o APC acesse os dispositivos próximos.',
  denied: 'Sem acesso à rede local, o APC não chega ao servidor. Toque de novo e permita o acesso aos dispositivos próximos.',
  blocked: 'O acesso à rede local está bloqueado para o APC, e sem ele o APC não chega ao servidor. Libere-o nas configurações do Android, em Permissões > Dispositivos próximos.',
  missing: 'O APC não tem acesso à rede local, por onde chega ao servidor no computador de casa.',
  allow: 'Permitir acesso',
  settings: 'Abrir configurações',
} as const;

/**
 * Tells whether this phone asks for the local network at all.
 * @returns True on Android 17 and later.
 */
function asks(): boolean {
  return Platform.OS === 'android' && Number(Platform.Version) >= ASKS_FROM_API;
}

/**
 * Tells whether the app may reach the local network now, without asking.
 * @returns True when it has the access, or the phone doesn't ask for it.
 */
export async function hasLocalNetwork(): Promise<boolean> {
  return !asks() || PermissionsAndroid.check(PERMISSION);
}

/**
 * Asks for the access, unless the app has it or the phone doesn't ask for it.
 * @returns How it went.
 */
export async function askLocalNetwork(): Promise<LocalNetworkAccess> {
  if (await hasLocalNetwork()) {
    return 'granted';
  }
  const status = await PermissionsAndroid.request(PERMISSION);
  return status === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
}

/**
 * Opens the app's page in Android's settings, where an access refused for good is given back.
 */
export function openAppSettings(): void {
  Linking.openSettings().catch(() => {});
}
