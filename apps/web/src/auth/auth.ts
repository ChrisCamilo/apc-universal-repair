import { createApiAuth } from '@apc/shared/auth'
import { API_BASE } from '../app/api.ts'
import { readStored, removeStored, writeStored } from '../app/storage.ts'
import { device } from './deviceKey.ts'

// The web app's login and sign-up: the AuthService on the API (see @apc/shared/auth), with the session in
// localStorage, signing with the device's key (see deviceKey.ts).

export const auth = createApiAuth(
  {
    getItem: async (key) => readStored(key),
    setItem: async (key, value) => writeStored(key, value),
    removeItem: async (key) => removeStored(key),
  },
  API_BASE,
  device,
)
