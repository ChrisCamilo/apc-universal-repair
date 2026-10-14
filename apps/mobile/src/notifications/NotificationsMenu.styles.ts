import { scales } from '@apc/shared/theme';
import { DISABLED_OPACITY } from '../Button.styles';
import { AVATAR_SIZE } from '../Menu.styles';
import { createStyles } from '../styles/createStyles';
import { fontFamily, softAccent, softHairline } from '../theme';

// The look of the notifications, the same as the web: the bell on its trigger, as big as the user menu's avatar, with
// the count of the unread on the accent at its corner, and in its menu the latest notifications, each with its kind's
// icon in the kind's color, the message and how long ago, the ones that were unread when the menu opened on the soft
// accent; or a muted notice when there are none. The gear in the menu's header opens its settings: the toast's time
// between a − and a + button.

/** How tall the list grows before it scrolls, in px (max-h-80 on the web). */
export const LIST_MAX_HEIGHT = scales.space.s1 * 80;

/** The bell on the menu's trigger and its unread badge. */
export const useBellStyles = createStyles('notifications.bell', { bell: '', badge: 'badge', badgeText: 'badge.text' }, (theme) => ({
  badge: {
    position: 'absolute',
    top: -scales.space.s1,
    right: -scales.space.s1 * 1.5,
    minWidth: scales.space.s4,
    height: scales.space.s4,
    paddingHorizontal: scales.space.s1,
    borderRadius: scales.radiusPill,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fontFamily(theme.displayFont, 700), fontSize: scales.fontSize.xs, lineHeight: scales.fontSize.xs, color: theme.colors.onAccent },
  bell: { width: AVATAR_SIZE, height: AVATAR_SIZE, alignItems: 'center', justifyContent: 'center' },
}));

/** The menu's list of notifications, each one and whether it was unread, and the notice when there are none. */
export const useStyles = createStyles(
  'notifications.menu',
  { list: 'list', item: 'list.item', icon: 'list.item.icon', text: 'list.item.text', message: 'list.item.message', time: 'list.item.time', empty: 'empty', emptyText: 'empty.text' },
  (theme) => ({
    empty: { alignItems: 'center', gap: scales.space.s2, paddingHorizontal: scales.space.s2, paddingVertical: scales.space.s5 },
    emptyText: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.sm, color: theme.colors.textMuted },
    icon: { marginTop: scales.space.s1 / 2 },
    item: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: scales.space.s2 + scales.space.s1 / 2,
      borderRadius: theme.radiusTile,
      paddingHorizontal: scales.space.s2,
      paddingVertical: scales.space.s2,
    },
    itemFresh: { backgroundColor: softAccent(theme) },
    list: { maxHeight: LIST_MAX_HEIGHT },
    message: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.sm, color: theme.colors.text },
    text: { flex: 1 },
    time: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.xs, color: theme.colors.textMuted },
  }),
);

/** The size of the settings' round buttons, in px (size-8 on the web). */
export const SETTINGS_BUTTON_SIZE = scales.space.s6;

/** The settings: the gear that opens them, and the toast's time with its − and + buttons. */
export const useSettingsStyles = createStyles(
  'notifications.settings',
  { setting: '', label: 'label', hint: 'label.hint', stepper: 'stepper', value: 'stepper.value', button: 'button' },
  (theme) => ({
    button: {
      width: SETTINGS_BUTTON_SIZE,
      height: SETTINGS_BUTTON_SIZE,
      borderRadius: scales.radiusPill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: { opacity: DISABLED_OPACITY },
    buttonOn: { backgroundColor: softAccent(theme) },
    hint: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.xs, color: theme.colors.textMuted },
    label: { flex: 1, fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.sm, color: theme.colors.text },
    setting: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scales.space.s3,
      marginBottom: scales.space.s1,
      paddingHorizontal: scales.space.s2,
      paddingTop: scales.space.s1,
      paddingBottom: scales.space.s3,
      borderBottomWidth: scales.hairline,
      borderBottomColor: softHairline(theme),
    },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: scales.space.s1 },
    value: { minWidth: scales.space.s1 * 10, textAlign: 'center', fontFamily: fontFamily(scales.monoFont), fontSize: scales.fontSize.sm, color: theme.colors.text },
  }),
);
