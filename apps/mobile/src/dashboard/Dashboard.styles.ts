import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';
import { barItemStyles } from '../styles/shared';
import { fontFamily, softHairline } from '../theme';

// The look of the Dashboard, the same as the web's on a phone (the Estoque mockup): the page on the canvas; on top, the
// open tab's header, with the compact APC mark and the tab's name; the tab's content under it, filling the screen down
// to the bottom bar; and the bar on the panel's fill over a soft hairline, 80px tall, with the tabs, then Alertas and
// Conta, each an equal share (see barItemStyles). Alertas shows the unread count in a badge on its pill's corner; Conta
// shows the user's initials on the accent in its pill.

/** The compact APC mark's width in the header, in px (HEADER_MARK_SIZE on the web). */
export const MARK_SIZE = 32;
/** The bottom bar's height above the home indicator, in px (BOTTOM_BAR_HEIGHT on the web). */
export const BOTTOM_BAR_HEIGHT = 80;
/** The tab's name in the header, in px (text-2xl on the web). */
const TITLE_SIZE = scales.fontSize['2xl'];
/** The initials' circle in Conta's pill, in px (size-6.5 on the web). */
const INITIALS_SIZE = scales.space.s1 * 6.5;
/** The badge's and the initials' text, in px (11px on the web). */
const BADGE_TEXT_SIZE = 11;

/** The Dashboard: the page, the header with the mark and the tab's name, the content and the bottom bar. */
export const useStyles = createStyles(
  'dashboard.dashboard',
  { page: '', header: 'header', mark: 'header.brand', title: 'header.title', content: 'main' },
  (theme) => ({
    content: { flex: 1, paddingHorizontal: scales.space.s4, paddingTop: scales.space.s1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scales.space.s3,
      minHeight: scales.touch.row + scales.space.s3 + scales.space.s1,
      paddingTop: scales.space.s3,
      paddingBottom: scales.space.s1,
      paddingLeft: scales.space.s4,
      paddingRight: scales.space.s2,
    },
    mark: {},
    page: { flex: 1, backgroundColor: theme.colors.canvas },
    title: {
      flex: 1,
      fontFamily: fontFamily(theme.displayFont, 700),
      fontSize: TITLE_SIZE,
      letterSpacing: theme.displayTracking * TITLE_SIZE,
      textTransform: 'uppercase',
      color: theme.colors.text,
    },
  }),
);

/** The bottom bar: the bar, an entry with its pill and label, the unread badge and the initials. */
export const useBarStyles = createStyles(
  'dashboard.bottom-bar',
  {
    bar: '',
    item: 'item',
    pill: 'item.pill',
    label: 'item.label',
    badge: 'item.pill.badge',
    badgeText: 'item.pill.badge.text',
    initials: 'item.pill.initials',
    initialsText: 'item.pill.initials.text',
  },
  (theme) => {
    const { barItem, barPill, barLabel, barLabelPressed } = barItemStyles(theme);
    const smallBold = { fontFamily: fontFamily(theme.displayFont, 700), fontSize: BADGE_TEXT_SIZE, color: theme.colors.onAccent };
    return {
      bar: {
        flexDirection: 'row',
        minHeight: BOTTOM_BAR_HEIGHT,
        paddingHorizontal: scales.space.s2,
        paddingTop: scales.space.s1 * 1.5,
        paddingBottom: scales.space.s1 * 4.5,
        borderTopWidth: scales.hairline,
        borderTopColor: softHairline(theme),
        backgroundColor: theme.colors.panel,
      },
      item: barItem,
      pill: barPill,
      label: barLabel,
      labelPressed: barLabelPressed,
      badge: {
        position: 'absolute',
        top: 0,
        right: scales.space.s3,
        minWidth: scales.space.s4,
        height: scales.space.s4,
        paddingHorizontal: scales.space.s1,
        borderRadius: scales.radiusPill,
        backgroundColor: theme.colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
      },
      badgeText: { ...smallBold, fontFamily: fontFamily(scales.bodyFont, 600), lineHeight: scales.space.s4 },
      initials: {
        width: INITIALS_SIZE,
        height: INITIALS_SIZE,
        borderRadius: scales.radiusPill,
        backgroundColor: theme.colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
      },
      initialsText: smallBold,
    };
  },
);
