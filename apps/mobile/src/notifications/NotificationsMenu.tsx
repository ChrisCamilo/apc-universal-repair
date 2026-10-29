import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { bellIcon, ICON_SIZES, minusIcon, plusIcon } from '@apc/shared/icons';
import { timeAgo, unreadBadge, type Notification } from '@apc/shared/notifications';
import { stepToastDuration, TOAST_DURATION, TOAST_KIND_LOOKS, toastDurationLabel } from '@apc/shared/toast';
import { Button } from '../Button';
import { BottomBarItem } from '../dashboard/BottomBarItem';
import { useBarStyles } from '../dashboard/Dashboard.styles';
import { Dialog } from '../Dialog';
import { Icon } from '../Icon';
import { useTheme } from '../theme';
import { useToastDuration } from '../Toast';
import { useSettingsStyles, useStyles } from './NotificationsMenu.styles';
import { useNotifications } from './useNotifications';

// The notifications, the same as the web's on a phone: Alertas in the Dashboard's bottom bar, the bell in its pill with
// a badge counting the unread, opens a full screen listing the latest toasts, newest first, each with its kind's icon
// and color, the message and how long ago, so one that went by too fast can be read again. Opening it marks them all
// read, which clears the badge; the ones that were unread stay lit until it closes. "Limpar notificações", at the
// bottom, empties it. Each user has their own, kept on the device; the app gives each user a fresh one (key = user id).
// "Tempo do aviso", on top, sets how long a toast stays (2 s to 15 s, 5 s by default) with − and + buttons; each press
// applies at once.

/** What the screen shows since it opened: the notifications that were unread then, and the time to count from. */
type Opened = { fresh: readonly number[]; now: Date };

export function NotificationsMenu({ userId }: { userId: string }) {
  const { colors } = useTheme();
  const { list, markRead, clear } = useNotifications(userId);
  const [opened, setOpened] = useState<Opened>({ fresh: [], now: new Date() });
  const [open, setOpen] = useState(false);
  const badge = unreadBadge(list);
  const bar = useBarStyles();
  const { styles, ids } = useStyles();

  /** Opens the screen and marks the notifications read, keeping which ones were unread lit while it stays open. */
  const show = () => {
    setOpened({ fresh: list.filter((notification) => !notification.read).map((notification) => notification.id), now: new Date() });
    markRead();
    setOpen(true);
  };

  return (
    <>
      <BottomBarItem label="Alertas" name={badge ? `Alertas, ${badge} não lidas` : undefined} expanded={open} onPress={show}>
        <Icon icon={bellIcon} size={ICON_SIZES.thumbnail} color={colors.textMuted} />
        {badge !== '' && (
          <View style={bar.styles.badge} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden testID={bar.ids.badge}>
            <Text style={bar.styles.badgeText} testID={bar.ids.badgeText}>
              {badge}
            </Text>
          </View>
        )}
      </BottomBarItem>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Notificações"
        closable
        actions={
          <Button variant="secondary" disabled={list.length === 0} onPress={clear}>
            Limpar notificações
          </Button>
        }
      >
        <DurationSetting />
        {list.length === 0 ? (
          <View style={styles.empty} testID={ids.empty}>
            <Icon icon={bellIcon} size={ICON_SIZES.thumbnail} color={colors.textMuted} />
            <Text style={styles.emptyText} testID={ids.emptyText}>
              Nenhuma notificação
            </Text>
          </View>
        ) : (
          <View accessibilityRole="list" accessibilityLabel="Últimas notificações" style={styles.list} testID={ids.list}>
            {list.map((notification) => (
              <NotificationEntry key={notification.id} notification={notification} fresh={opened.fresh.includes(notification.id)} now={opened.now} />
            ))}
          </View>
        )}
      </Dialog>
    </>
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
