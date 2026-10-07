import { createMockAuth } from '@apc/shared/auth'
import { TEST_USERS } from '@apc/shared/test-users'
import { readStored, removeStored, writeStored } from '../storage.ts'

// The web app's login: the mocked AuthService (see @apc/shared/auth) with the session in localStorage, until the
// real backend (EP-10) takes its place behind the same interface.

export const auth = createMockAuth(
  {
    getItem: async (key) => readStored(key),
    setItem: async (key, value) => writeStored(key, value),
    removeItem: async (key) => removeStored(key),
  },
  TEST_USERS,
)
