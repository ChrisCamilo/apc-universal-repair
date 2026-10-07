import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import { createMockAuth } from '@apc/shared/auth';
import { TEST_USERS } from '@apc/shared/test-users';

// The mobile app's login: the mocked AuthService (see @apc/shared/auth) with the session in AsyncStorage, until the
// real backend (EP-10) takes its place behind the same interface.

export const auth = createMockAuth(createAsyncStorage('apc-universal-repair'), TEST_USERS);
