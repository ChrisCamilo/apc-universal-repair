import { scales } from '@apc/shared/theme';
import { DISABLED_OPACITY } from '../Button.styles';
import { createStyles } from '../styles/createStyles';
import { fontFamily, softAccent, softHairline } from '../theme';

// The look of the notifications, the same as the web's on a phone: in their full screen, the toast's time on top,
// between a − and a + button 44px for a finger, then the latest notifications, each with its kind's icon in the kind's
// color, the message and how long ago, the ones that were unread when it opened on the soft accent; or a muted notice
// when there are none. The list grows and the screen scrolls. Alertas, in the Dashboard's bottom bar, has its own look
// (see Dashboard.styles.ts).

/** The list of notifications, each one and whether it was unread, and the notice when there are none. */
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
    list: {},
    message: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.sm, color: theme.colors.text },
    text: { flex: 1 },
    time: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.xs, color: theme.colors.textMuted },
  }),
);

/** The settings: the toast's time with its − and + buttons. */
export const useSettingsStyles = createStyles(
  'notifications.settings',
  { setting: '', label: 'label', hint: 'label.hint', stepper: 'stepper', value: 'stepper.value', button: 'button' },
  (theme) => ({
    button: {
      width: scales.touch.icon,
      height: scales.touch.icon,
      borderRadius: scales.radiusPill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: { opacity: DISABLED_OPACITY },
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
