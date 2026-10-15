import { getGenericPassword, resetGenericPassword, setGenericPassword } from 'react-native-keychain';
import { createApiAuth, type SessionStore } from '@apc/shared/auth';
import { API_URL } from '../api';

// The mobile app's login and sign-up: the AuthService on the API (see @apc/shared/auth), with the session, its token
// included, in the phone's keychain (the Android Keystore, the iOS Keychain), out of reach of other apps and backups,
// unlike AsyncStorage, where the preferences stay.

/** The session in the keychain: each key a keychain service holding one value. */
const KEYCHAIN: SessionStore = {
  getItem: async (key) => {
    const saved = await getGenericPassword({ service: key });
    return saved ? saved.password : null;
  },
  setItem: async (key, value) => {
    await setGenericPassword('session', value, { service: key });
  },
  removeItem: async (key) => {
    await resetGenericPassword({ service: key });
  },
};

export const auth = createApiAuth(KEYCHAIN, API_URL);
