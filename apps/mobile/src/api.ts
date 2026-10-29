import { Platform } from 'react-native';
import { DEV_SERVER_PORT } from '@apc/shared/server';

/**
 * Where the app reaches the API. In development, the development port of the computer: the Android emulator reaches it
 * at 10.0.2.2 and the iOS simulator at localhost. A release build uses the address it was built with, `APC_API_URL`,
 * which babel.config.js writes into the bundle.
 */
export const API_URL = __DEV__
  ? `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:${DEV_SERVER_PORT}`
  : (process.env.APC_API_URL as string);
