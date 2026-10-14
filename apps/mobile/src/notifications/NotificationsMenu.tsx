import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { bellIcon, gearIcon, ICON_SIZES, minusIcon, plusIcon } from '@apc/shared/icons';
import { timeAgo, unreadBadge, type Notification } from '@apc/shared/notifications';
import { stepToastDuration, TOAST_DURATION, TOAST_KIND_LOOKS, toastDurationLabel } from '@apc/shared/toast';
import { Icon } from '../Icon';
import { Menu, MenuHeader, MenuItem } from '../Menu';
import { Divider } from '../Panel';
import { useTheme } from '../theme';
import { useToastDuration } from '../Toast';
import { useBellStyles, useSettingsStyles, useStyles } from './NotificationsMenu.styles';
import { useNotifications } from './useNotifications';

// The bell to the left of the user menu, in the Dashboard header, the same as the web: a badge counts the unread
// notifications, and its menu lists the latest toasts, newest first, each with its kind's icon and color, the message
// and how long ago, so one that went by too fast can be read again. Opening it marks them all read, which clears the
// badge; the ones that were unread stay lit until it closes. "Limpar notificações" empties it. Each user has their own,
// kept on the device; the app gives each user a fresh one (key = user id). The gear in its header shows "Tempo do
// aviso", how long a toast stays (2 s to 15 s, 5 s by default), with − and + buttons; each press applies at once and
// keeps the menu open, like the user menu's choices.

/** What the menu shows since it opened: the notifications that were unread then, and the time to count from. */
type Opened = { fresh: readonly number[]; now: Date };

export function NotificationsMenu({ userId }: { userId: string }) {
  const { colors } = useTheme();
  const { list, markRead, clear } = useNotifications(userId);
  const [opened, setOpened] = useState<Opened>({ fresh: [], now: new Date() });
  const [settings, setSettings] = useState(false);
  const badge = unreadBadge(list);
  const bell = useBellStyles();
  const { styles, ids } = useStyles();

  /** Marks the notifications read as the menu opens, keeping which ones were unread lit while it stays open. */
  const openChange = (open: boolean) => {
    if (open) {
      setSettings(false);
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
      <MenuHeader title="Notificações" action={<SettingsButton open={settings} onPress={() => setSettings((shown) => !shown)} />} />
      {settings && <DurationSetting />}
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

/** The gear in the menu's header, which shows or hides the settings. */
function SettingsButton({ open, onPress }: { open: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const { styles, ids } = useSettingsStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Configurações das notificações"
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={[styles.button, open && styles.buttonOn]}
      testID={ids.button}
    >
      <Icon icon={gearIcon} size={ICON_SIZES.prominent} color={open ? colors.accent : colors.textMuted} />
    </Pressable>
  );
}

/** "Tempo do aviso": how long a toast stays, between a − and a + button that stop at the shortest and the longest. */
function DurationSetting() {
  const { colors } = useTheme();
  const { ms, setMs } = useToastDuration();
  const { styles, ids } = useSettingsStyles();
  const step = (direction: 1 | -1, label: string, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => setMs(stepToastDuration(ms, direction))}
      style={[styles.button, disabled && styles.buttonDisabled]}
      testID={ids.button}
    >
      <Icon icon={direction === 1 ? plusIcon : minusIcon} size={ICON_SIZES.body} color={colors.textMuted} />
    </Pressable>
  );
  return (
    <View accessibilityLabel="Tempo do aviso" style={styles.setting} testID={ids.setting}>
      <Text style={styles.label} testID={ids.label}>
        Tempo do aviso{'\n'}
        <Text style={styles.hint} testID={ids.hint}>
          Quanto tempo cada aviso fica na tela
        </Text>
      </Text>
      <View style={styles.stepper} testID={ids.stepper}>
        {step(-1, 'Diminuir o tempo do aviso', ms <= TOAST_DURATION.minMs)}
        <Text accessibilityLiveRegion="polite" style={styles.value} testID={ids.value}>
          {toastDurationLabel(ms)}
        </Text>
        {step(1, 'Aumentar o tempo do aviso', ms >= TOAST_DURATION.maxMs)}
      </View>
    </View>
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
