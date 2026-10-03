import { Platform } from 'react-native';

/**
 * Where the API runs during development, on port 3333 of the computer: the Android emulator reaches it at
 * 10.0.2.2 and the iOS simulator at localhost.
 */
export const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3333' : 'http://localhost:3333';
