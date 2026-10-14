import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { bellIcon, ICON_SIZES } from '@apc/shared/icons';
import { timeAgo, unreadBadge, type Notification } from '@apc/shared/notifications';
import { TOAST_KIND_LOOKS } from '@apc/shared/toast';
import { Icon } from '../Icon';
import { Menu, MenuHeader, MenuItem } from '../Menu';
import { Divider } from '../Panel';
import { useTheme } from '../theme';
import { useBellStyles, useStyles } from './NotificationsMenu.styles';
import { useNotifications } from './useNotifications';

// The bell to the left of the user menu, in the Dashboard header, the same as the web: a badge counts the unread
// notifications, and its menu lists the latest toasts, newest first, each with its kind's icon and color, the message
// and how long ago, so one that went by too fast can be read again. Opening it marks them all read, which clears the
// badge; the ones that were unread stay lit until it closes. "Limpar notificações" empties it. Each user has their own,
// kept on the device; the app gives each user a fresh one (key = user id).

/** What the menu shows since it opened: the notifications that were unread then, and the time to count from. */
type Opened = { fresh: readonly number[]; now: Date };

export function NotificationsMenu({ userId }: { userId: string }) {
  const { colors } = useTheme();
  const { list, markRead, clear } = useNotifications(userId);
  const [opened, setOpened] = useState<Opened>({ fresh: [], now: new Date() });
  const badge = unreadBadge(list);
  const bell = useBellStyles();
  const { styles, ids } = useStyles();

  /** Marks the notifications read as the menu opens, keeping which ones were unread lit while it stays open. */
  const openChange = (open: boolean) => {
    if (open) {
      setOpened({ fresh: list.filter((notification) => !notification.read).map((notification) => notification.id), now: new Date() });
      markRead();
    }
  };

  return (
    <Menu
      label={badge ? `Notificações, ${badge} não lidas` : 'Notificações'}
      onOpenChange={openChange}
      trigger={
        <View style={bell.styles.bell} testID={bell.ids.bell}>
          <Icon icon={bellIcon} size={ICON_SIZES.prominent} />
          {badge !== '' && (
            <View style={bell.styles.badge} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden testID={bell.ids.badge}>
              <Text style={bell.styles.badgeText} testID={bell.ids.badgeText}>
                {badge}
              </Text>
            </View>
          )}
        </View>
      }
    >
      <MenuHeader title="Notificações" />
      {list.length === 0 ? (
        <View style={styles.empty} testID={ids.empty}>
          <Icon icon={bellIcon} size={ICON_SIZES.thumbnail} color={colors.textMuted} />
          <Text style={styles.emptyText} testID={ids.emptyText}>
            Nenhuma notificação
          </Text>
        </View>
      ) : (
        <>
          <ScrollView accessibilityRole="list" accessibilityLabel="Últimas notificações" style={styles.list} testID={ids.list}>
            {list.map((notification) => (
              <NotificationEntry key={notification.id} notification={notification} fresh={opened.fresh.includes(notification.id)} now={opened.now} />
            ))}
          </ScrollView>
          <Divider />
          <MenuItem onSelect={clear}>Limpar notificações</MenuItem>
        </>
      )}
    </Menu>
  );
}

/** A notification in the list: its kind's icon in the kind's color, the message and how long ago it was shown. */
function NotificationEntry({ notification, fresh, now }: { notification: Notification; fresh: boolean; now: Date }) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  const look = TOAST_KIND_LOOKS[notification.kind];
  return (
    <View accessible style={[styles.item, fresh && styles.itemFresh]} testID={ids.item}>
      <View style={styles.icon} testID={ids.icon}>
        <Icon icon={look.icon} size={ICON_SIZES.label} color={colors[look.color]} />
      </View>
      <View style={styles.text} testID={ids.text}>
        <Text style={styles.message} testID={ids.message}>
          {notification.message}
        </Text>
        <Text style={styles.time} testID={ids.time}>
          {timeAgo(notification.at, now)}
        </Text>
      </View>
    </View>
  );
}
