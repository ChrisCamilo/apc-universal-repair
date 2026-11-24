/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { BACKGROUND_SYNC_TASK, backgroundSync } from './src/features/inventory/backgroundSync';

AppRegistry.registerComponent(appName, () => App);
// The copy's sync while the app is out of sight, which Android runs every 15 minutes or so (see BackgroundSyncJob.kt).
AppRegistry.registerHeadlessTask(BACKGROUND_SYNC_TASK, () => backgroundSync);
