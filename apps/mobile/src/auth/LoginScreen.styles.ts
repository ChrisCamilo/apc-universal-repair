import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';

// The look of the login and sign-up screens, the same as the web's on a phone: the badge on a panel above the form,
// centered, the form no wider than the web's.

/** The badge's width, as the web gives it on a phone (w-36). */
export const BADGE_WIDTH = scales.space.s1 * 36;
/** The widest the content gets on a wide screen, as wide as the web's form (max-w-sm). */
export const CONTENT_MAX_WIDTH = scales.space.s1 * 96;

/** Each part's path in an auth screen. */
export const AUTH_SCREEN_PATHS = { page: '', title: 'brand.title', form: 'form', alert: 'form.alert', actions: 'form.actions' };

/**
 * Builds the look of an auth screen: the page and its content, the badge's panel and heading, and the form with its
 * alert and actions.
 * @returns The styles, by part.
 */
export function authScreenStyles() {
  return {
    actions: { alignItems: 'flex-start', gap: scales.space.s2 },
    alert: {},
    brand: { alignItems: 'center', paddingVertical: scales.space.s5 },
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
    page: { flex: 1 },
    title: {},
  } as const;
}

/** The login screen: the page and its content, the badge's panel and heading, and the form with its alert and actions. */
export const useStyles = createStyles('auth.login-screen', AUTH_SCREEN_PATHS, authScreenStyles);
