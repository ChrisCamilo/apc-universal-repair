import { useState } from 'react'
import { bellIcon, ICON_SIZES } from '@apc/shared/icons'
import { timeAgo, unreadBadge, type Notification } from '@apc/shared/notifications'
import { TOAST_KIND_LOOKS } from '@apc/shared/toast'
import { useSession } from '../auth/sessionContext.ts'
import { Icon } from '../components/Icon.tsx'
import { Menu, MenuHeader, MenuItem } from '../components/Menu.tsx'
import { Divider } from '../components/Panel.tsx'
import { bellBadge, notificationsMenu } from './NotificationsMenu.styles.ts'
import { useNotifications } from './useNotifications.ts'

// The bell to the left of the user menu, in the Dashboard header: a badge counts the unread notifications, and its menu
// lists the latest toasts, newest first, each with its kind's icon and color, the message and how long ago, so one that
// went by too fast can be read again. Opening it marks them all read, which clears the badge; the ones that were unread
// stay lit until it closes. "Limpar notificações" empties it. Each user has their own, kept on the device.

/** What the menu shows since it opened: the notifications that were unread then, and the time to count from. */
type Opened = { fresh: readonly number[]; now: Date }

export function NotificationsMenu() {
  const { user } = useSession()
  // Nobody to show for a moment after "Sair", until the app leaves the Dashboard; each user starts on their own list.
  return user ? <UserNotifications key={user.id} userId={user.id} /> : null
}

function UserNotifications({ userId }: { userId: string }) {
  const { list, markRead, clear } = useNotifications(userId)
  const [opened, setOpened] = useState<Opened>({ fresh: [], now: new Date() })
  const badge = unreadBadge(list)
  const { classes, ids } = bellBadge()
  const menu = notificationsMenu()

  /** Marks the notifications read as the menu opens, keeping which ones were unread lit while it stays open. */
  const openChange = (open: boolean) => {
    if (open) {
      setOpened({ fresh: list.filter((notification) => !notification.read).map((notification) => notification.id), now: new Date() })
      markRead()
    }
  }

  return (
    <Menu
      label={badge ? `Notificações, ${badge} não lidas` : 'Notificações'}
      anchor="container"
      onOpenChange={openChange}
      trigger={
        <span className={classes.base()} data-testid={ids.base}>
          <Icon icon={bellIcon} size={ICON_SIZES.prominent} />
          {badge && (
            <span aria-hidden="true" className={classes.badge()} data-testid={ids.badge}>
              {badge}
            </span>
          )}
        </span>
      }
    >
      <MenuHeader title="Notificações" />
      {list.length === 0 ? (
        <p className={menu.classes.empty()} data-testid={menu.ids.empty}>
          <Icon icon={bellIcon} size={ICON_SIZES.thumbnail} />
          Nenhuma notificação
        </p>
      ) : (
        <>
          <ol aria-label="Últimas notificações" className={menu.classes.list()} data-testid={menu.ids.list}>
            {list.map((notification) => (
              <NotificationEntry key={notification.id} notification={notification} fresh={opened.fresh.includes(notification.id)} now={opened.now} />
            ))}
          </ol>
          <Divider />
          <MenuItem onSelect={clear}>Limpar notificações</MenuItem>
        </>
      )}
    </Menu>
  )
}

/** A notification in the list: its kind's icon in the kind's color, the message and how long ago it was shown. */
function NotificationEntry({ notification, fresh, now }: { notification: Notification; fresh: boolean; now: Date }) {
  const { classes, ids } = notificationsMenu({ kind: notification.kind, fresh })
  return (
    <li className={classes.item()} data-testid={ids.item} data-kind={notification.kind} data-fresh={fresh || undefined}>
      <span className={classes.icon()} data-testid={ids.icon}>
        <Icon icon={TOAST_KIND_LOOKS[notification.kind].icon} size={ICON_SIZES.label} />
      </span>
      <span className={classes.text()} data-testid={ids.text}>
        <span className={classes.message()} data-testid={ids.message}>
          {notification.message}
        </span>
        <time dateTime={notification.at} className={classes.time()} data-testid={ids.time}>
          {timeAgo(notification.at, now)}
        </time>
      </span>
    </li>
  )
}
