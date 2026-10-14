import { useEffect, useState } from 'react';
import { addNotification, markAllRead, NOTIFICATIONS_LIMIT, notificationsKey, readNotifications, type Notification } from '@apc/shared/notifications';
import { save, themeStorage } from '../theme';
import { useToastFeed } from '../Toast';

/** A user's notifications and the ways to change them. */
export type Notifications = {
  /** The notifications, newest first. */
  list: readonly Notification[];
  markRead: () => void;
  clear: () => void;
};

/**
 * Keeps a user's notifications, the same as the web: every toast shown is added, and the list is saved on the device
 * under the user's key. Toasts heard before the saved list is read go on top of it.
 * @param userId The logged user's id.
 * @returns The notifications and the ways to mark them read or clear them.
 */
export function useNotifications(userId: string): Notifications {
  const key = notificationsKey(userId);
  // Null until the saved list is read.
  const [list, setList] = useState<readonly Notification[] | null>(null);

  useToastFeed((kind, message) => setList((current) => addNotification(current ?? [], kind, message, new Date())));

  // Read the saved list once.
  useEffect(() => {
    let live = true;
    themeStorage
      .getItem(key)
      .catch(() => null)
      .then((saved) => {
        if (live) {
          setList((current) => {
            const kept = [...(current ?? []), ...readNotifications(saved)].slice(0, NOTIFICATIONS_LIMIT);
            // Number them again from the oldest, so ids stay unique and the newest has the highest.
            return kept.map((notification, index) => ({ ...notification, id: kept.length - index }));
          });
        }
      });
    return () => {
      live = false;
    };
  }, [key]);

  // Save every change once the saved list is in.
  useEffect(() => {
    if (list) {
      save(key, JSON.stringify(list));
    }
  }, [key, list]);

  return {
    list: list ?? [],
    markRead: () => setList((current) => current && markAllRead(current)),
    clear: () => setList([]),
  };
}
