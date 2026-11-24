import { useEffect, useEffectEvent } from 'react';
import { AppState, Linking, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { TOAST_KIND_LOOKS } from '@apc/ui-spec/toast';
import { save, themeStorage } from '../../app/theme';
import { useToastFeed } from '../../components/Toast';

// The app's notifications in the Android shade, the same as the desktop's Windows notifications: local ones, with no
// push server, on the "Notificações do APC" channel (SystemNotificationsModule.kt). Android pauses the app's JavaScript
// while it is out of sight, so what reaches the shade comes from the copy's sync in the background (see
// backgroundSync.ts): the changes the server refused and the items newly at their minimum; in the foreground the toasts
// say them. Android 13 and later ask the user for the notification permission, which can only be asked with the app in
// sight: the app asks once, the first time an error or warning shows with it open, and keeps working without it if
// refused, Android then showing nothing. A tap on a notification opens the app with the bell's notifications open.

/** The first Android API that asks for the notification permission: Android 13. */
const ASKS_FROM_API = 33;
/** Where the device keeps that the permission was asked, so it is asked once. */
export const NOTIFICATIONS_ASKED_KEY = 'apc-notifications-asked';
/** What a notification opens the app on, which opens the bell's notifications. */
export const OPEN_NOTIFICATIONS_URL = 'apcuniversalrepair://notifications';

/** The native side that shows the notifications (SystemNotificationsModule.kt). */
const native = NativeModules.SystemNotifications as { show: (title: string, message: string) => Promise<void> };
/** Whether the link the app started on was already taken, so a later Dashboard doesn't open the notifications again. */
let startTaken = false;

/**
 * Shows a notification in the Android shade; without the permission Android shows nothing, and nothing fails.
 * @param title Its title, e.g. "Aviso".
 * @param message Its text.
 */
export async function showSystemNotification(title: string, message: string): Promise<void> {
  await native.show(title, message).catch(() => {});
}

/**
 * Asks for the notification permission, once on the device, on Android 13 and later; a refusal is kept as it is.
 */
async function askOnce(): Promise<void> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < ASKS_FROM_API) {
    return;
  }
  const asked = await themeStorage.getItem(NOTIFICATIONS_ASKED_KEY).catch(() => null);
  if (asked) {
    return;
  }
  save(NOTIFICATIONS_ASKED_KEY, '1');
  await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(() => {});
}

/**
 * Asks for the notification permission the first time an error or a warning shows in the foreground, and opens the
 * bell's notifications when one in the shade is tapped.
 * @param onOpen Opens the bell's notifications.
 */
export function useSystemNotifications(onOpen: () => void): void {
  useToastFeed((kind) => {
    if (TOAST_KIND_LOOKS[kind].urgent && AppState.currentState === 'active') {
      askOnce();
    }
  });

  const open = useEffectEvent((url: string | null | undefined) => {
    if (url === OPEN_NOTIFICATIONS_URL) {
      onOpen();
    }
  });
  useEffect(() => {
    if (!startTaken) {
      startTaken = true;
      Linking.getInitialURL().then(open, () => {});
    }
    const subscription = Linking.addEventListener('url', ({ url }) => open(url));
    return () => subscription.remove();
  }, []);
}
