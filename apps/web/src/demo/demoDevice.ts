import type { DeviceSigner } from '@apc/domain/devices'

// The demo's device: not a key at all. The demo authorizes no devices (see demoApi.ts), so it makes no key pair and
// keeps nothing in the browser; the logins it sends carry this stand-in, which no real server accepts: it isn't an
// ECDSA P-256 key, so the API's check of its "signature" fails, and a login carrying it is refused.

/** What the demo's logins send in place of a public key and a signature. */
export const DEMO_DEVICE_STAND_IN = 'demo'

/** The demo's stand-in for the device's key, which startDemo puts in place of the browser's (see deviceKey.ts). */
export const demoDevice: DeviceSigner = {
  publicKey: async () => DEMO_DEVICE_STAND_IN,
  sign: async () => DEMO_DEVICE_STAND_IN,
}
