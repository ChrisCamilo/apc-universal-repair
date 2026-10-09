import { createApiAuth } from '@apc/shared/auth'
import { API_BASE } from '../api.ts'
import { readStored, removeStored, writeStored } from '../storage.ts'

// The web app's login and sign-up: the AuthService on the API (see @apc/shared/auth), with the session in
// localStorage.

export const auth = createApiAuth(
  {
    getItem: async (key) => readStored(key),
    setItem: async (key, value) => writeStored(key, value),
    removeItem: async (key) => removeStored(key),
  },
  API_BASE,
)
