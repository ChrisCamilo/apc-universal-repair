import { Platform } from 'react-native';
import { DEV_SERVER_PORT } from '@apc/shared/server';

/**
 * Where the API runs during development, on the development port of the computer: the Android emulator reaches it at
 * 10.0.2.2 and the iOS simulator at localhost.
 */
export const API_URL = `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:${DEV_SERVER_PORT}`;
