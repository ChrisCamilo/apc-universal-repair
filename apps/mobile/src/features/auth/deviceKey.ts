import { NativeModules } from 'react-native';
import type { DeviceSigner } from '@apc/domain/devices';

// The phone's device key for logging in (see @apc/domain/devices), kept in the Android Keystore by the native side
// (DeviceKeyModule.kt), made on its first use: the app gets its public key and signatures of the API's nonces, never the
// private key.

/** The native side that holds the key. */
const native = NativeModules.DeviceKey as DeviceSigner;

/** The phone's device key. */
export const device: DeviceSigner = {
  publicKey: () => native.publicKey(),
  sign: (nonce) => native.sign(nonce),
};
