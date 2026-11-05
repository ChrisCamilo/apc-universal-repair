import { LOGIN_BRAND } from '@apc/shared/auth';
import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';
import { fontFamily, softAccent } from '../theme';

/** The side of the tinted square that holds the QR code of Conectar a outro servidor, in px. */
export const CONNECT_ICON_TILE = scales.space.s1 * 10;

// The look of the login and sign-up screens, the same as the web's on a phone: one column, centered, no wider than the
// web's form.

/** The widest the content gets on a wide screen, as wide as the web's form (max-w-sm). */
export const CONTENT_MAX_WIDTH = scales.space.s1 * 96;

/**
 * Builds the look of an auth screen: the page and its content, and the form with its notice, alert and actions.
 * @returns The styles, by part.
 */
export function authScreenStyles() {
  return {
    actions: { alignItems: 'flex-start', gap: scales.space.s2 },
    alert: {},
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      alignSelf: 'center',
      width: '100%',
      maxWidth: CONTENT_MAX_WIDTH,
      gap: scales.space.s5,
      padding: scales.space.s4,
    },
    form: { gap: scales.space.s4 },
    notice: {},
    page: { flex: 1 },
  } as const;
}

/**
 * The login screen, as the web's on a phone: one column with 24px gutters, the mark over the name and the tagline
 * centered on top, what the login asks for, the form with its notice, alert and actions, and the question that opens
 * the sign-up at the bottom of the screen, over the card that pairs the phone again: the QR code in a tinted square,
 * what it does over how, and a chevron, its frame taking the accent while pressed.
 */
export const useStyles = createStyles(
  'auth.login-screen',
  {
    page: '',
    heading: 'heading',
    headingTitle: 'heading.title',
    name: 'heading.title.name',
    tagline: 'heading.title.tagline',
    intro: 'heading.intro',
    form: 'form',
    notice: 'form.notice',
    alert: 'form.alert',
    actions: 'form.actions',
    account: 'account',
    connect: 'account.connect',
    connectIcon: 'account.connect.icon',
    connectText: 'account.connect.text',
    connectTitle: 'account.connect.text.title',
  },
  (theme) => {
    const auth = authScreenStyles();
    const { colors } = theme;
    return {
      ...auth,
      account: { marginTop: 'auto', gap: scales.space.s2 + scales.space.s1 / 2 },
      actions: { gap: scales.space.s4 },
      connect: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scales.space.s3,
        minHeight: scales.touch.row,
        paddingHorizontal: scales.space.s3,
        paddingVertical: scales.space.s2,
        borderWidth: scales.hairline,
        borderColor: colors.hairline,
        borderRadius: theme.radiusPanel,
        backgroundColor: colors.panelRaised,
      },
      connectIcon: {
        alignItems: 'center',
        justifyContent: 'center',
        width: CONNECT_ICON_TILE,
        height: CONNECT_ICON_TILE,
        borderRadius: theme.radiusTile,
        backgroundColor: softAccent(theme),
      },
      connectPressed: { borderColor: colors.accent },
      connectText: { flex: 1, gap: scales.space.s1 / 2 },
      connectTitle: { fontFamily: fontFamily(scales.bodyFont, 600), fontSize: scales.fontSize.base, color: colors.text },
      content: {
        ...auth.content,
        justifyContent: 'flex-start',
        gap: scales.space.s5,
        paddingHorizontal: scales.space.s5,
        paddingTop: scales.space.s7 + scales.space.s2,
        paddingBottom: scales.space.s6,
      },
      heading: { alignItems: 'center', gap: scales.space.s2 + scales.space.s1 / 2 },
      headingTitle: { alignItems: 'center', gap: scales.space.s1 },
      intro: { marginTop: scales.space.s6 - scales.space.s1 / 2 },
      name: {
        fontFamily: fontFamily(theme.displayFont, 700),
        fontSize: LOGIN_BRAND.name,
        lineHeight: LOGIN_BRAND.name,
        letterSpacing: theme.displayTracking * LOGIN_BRAND.name,
        textTransform: 'uppercase',
        color: theme.colors.text,
      },
      tagline: {
        fontFamily: fontFamily(theme.displayFont, 600),
        fontSize: LOGIN_BRAND.tagline,
        letterSpacing: LOGIN_BRAND.taglineTracking * LOGIN_BRAND.tagline,
        textTransform: 'uppercase',
        color: theme.colors.textMuted,
      },
    };
  },
);
