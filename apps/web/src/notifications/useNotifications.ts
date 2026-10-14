import { useEffect, useState } from 'react'
import { addNotification, markAllRead, notificationsKey, readNotifications, type Notification } from '@apc/shared/notifications'
import { useToastFeed } from '../components/toastContext.ts'
import { readStored, writeStored } from '../storage.ts'

/** A user's notifications and the ways to change them. */
export type Notifications = {
  /** The notifications, newest first. */
  list: readonly Notification[]
  markRead: () => void
  clear: () => void
}

/**
 * Keeps a user's notifications: every toast shown is added, and the list is saved on the device under the user's key.
 * @param userId The logged user's id.
 * @returns The notifications and the ways to mark them read or clear them.
 */
export function useNotifications(userId: string): Notifications {
  const key = notificationsKey(userId)
  const [list, setList] = useState<readonly Notification[]>(() => readNotifications(readStored(key)))

  useToastFeed((kind, message) => setList((current) => addNotification(current, kind, message, new Date())))

  // Save every change.
  useEffect(() => {
    writeStored(key, JSON.stringify(list))
  }, [key, list])

  return { list, markRead: () => setList(markAllRead), clear: () => setList([]) }
}
