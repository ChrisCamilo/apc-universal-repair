import { useEffect, useEffectEvent, useState } from 'react'
import { bellIcon, gearIcon, ICON_SIZES, minusIcon, plusIcon } from '@apc/shared/icons'
import { timeAgo, unreadBadge, type Notification } from '@apc/shared/notifications'
import { stepToastDuration, TOAST_DURATION, TOAST_KIND_LOOKS, toastDurationLabel } from '@apc/shared/toast'
import { useSession } from '../auth/sessionContext.ts'
import { Icon } from '../components/Icon.tsx'
import { Menu, MenuHeader, MenuItem } from '../components/Menu.tsx'
import { Divider } from '../components/Panel.tsx'
import { useToastDuration, useToastFeed } from '../components/toastContext.ts'
import { desktopBridge } from '../desktop/desktopBridge.ts'
import { bellBadge, notificationsMenu, notificationsSettings } from './NotificationsMenu.styles.ts'
import { useNotifications } from './useNotifications.ts'

// The bell to the left of the user menu, in the Dashboard header: a badge counts the unread notifications, and its menu
// lists the latest toasts, newest first, each with its kind's icon and color, the message and how long ago, so one that
// went by too fast can be read again. Opening it marks them all read, which clears the badge; the ones that were unread
// stay lit until it closes. "Limpar notificações" empties it. Each user has their own, kept on the device. The gear in
// its header shows "Tempo do aviso", how long a toast stays (2 s to 15 s, 5 s by default), with − and + buttons; each
// press applies at once and keeps the menu open, like the user menu's choices. In the desktop app, each error and warning,
// low-stock warnings included, also asks for a Windows notification, shown while the window isn't focused; clicking it
// brings the window up with this menu open.

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
  const [settings, setSettings] = useState(false)
  const [open, setOpen] = useState(false)
  const badge = unreadBadge(list)
  const { classes, ids } = bellBadge()
  const menu = notificationsMenu()

  /** Marks the notifications read as the menu opens, keeping which ones were unread lit while it stays open. */
  const openChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setSettings(false)
      setOpened({ fresh: list.filter((notification) => !notification.read).map((notification) => notification.id), now: new Date() })
      markRead()
    }
  }

  // In the desktop app, ask for a Windows notification of each error and warning.
  useToastFeed((kind, message) => {
    if (TOAST_KIND_LOOKS[kind].urgent) {
      desktopBridge()?.notify(TOAST_KIND_LOOKS[kind].title, message)
    }
  })

  // In the desktop app, open the menu when a Windows notification is clicked.
  const openFromDesktop = useEffectEvent(() => openChange(true))
  useEffect(() => desktopBridge()?.onOpenNotifications(() => openFromDesktop()), [])

  return (
    <Menu
      label={badge ? `Notificações, ${badge} não lidas` : 'Notificações'}
      anchor="container"
      open={open}
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
      <MenuHeader
        title="Notificações"
        action={<SettingsButton open={settings} onPress={() => setSettings((shown) => !shown)} />}
      />
      {settings && <DurationSetting />}
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

/** The gear in the menu's header, which shows or hides the settings. */
function SettingsButton({ open, onPress }: { open: boolean; onPress: () => void }) {
  const { classes, ids } = notificationsSettings({ open })
  return (
    <button
      type="button"
      aria-label="Configurações das notificações"
      aria-expanded={open}
      className={classes.button()}
      data-testid={ids.button}
      onClick={onPress}
    >
      <Icon icon={gearIcon} size={ICON_SIZES.prominent} />
    </button>
  )
}

/** "Tempo do aviso": how long a toast stays, between a − and a + button that stop at the shortest and the longest. */
function DurationSetting() {
  const { ms, setMs } = useToastDuration()
  const { classes, ids } = notificationsSettings()
  return (
    <div role="group" aria-label="Tempo do aviso" className={classes.base()} data-testid={ids.base}>
      <span className={classes.label()} data-testid={ids.label}>
        Tempo do aviso
        <small className={classes.hint()} data-testid={ids.hint}>
          Quanto tempo cada aviso fica na tela
        </small>
      </span>
      <span className={classes.stepper()} data-testid={ids.stepper}>
        <button
          type="button"
          aria-label="Diminuir o tempo do aviso"
          disabled={ms <= TOAST_DURATION.minMs}
          className={classes.button()}
          data-testid={ids.button}
          onClick={() => setMs(stepToastDuration(ms, -1))}
        >
          <Icon icon={minusIcon} size={ICON_SIZES.body} />
        </button>
        <output aria-live="polite" className={classes.value()} data-testid={ids.value}>
          {toastDurationLabel(ms)}
        </output>
        <button
          type="button"
          aria-label="Aumentar o tempo do aviso"
          disabled={ms >= TOAST_DURATION.maxMs}
          className={classes.button()}
          data-testid={ids.button}
          onClick={() => setMs(stepToastDuration(ms, 1))}
        >
          <Icon icon={plusIcon} size={ICON_SIZES.body} />
        </button>
      </span>
    </div>
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
