import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import { createApiAuth } from '@apc/shared/auth';
import { API_URL } from '../api';

// The mobile app's login and sign-up: the AuthService on the API (see @apc/shared/auth), with the session in
// AsyncStorage.

export const auth = createApiAuth(createAsyncStorage('apc-universal-repair'), API_URL);
