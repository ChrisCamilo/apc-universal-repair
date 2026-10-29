import { REGISTER_TITLE } from '@apc/shared/auth';
import { DIALOG_HEADER_HEIGHT } from '@apc/shared/dialog';
import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';
import { fontFamily } from '../theme';
import { authScreenStyles } from './LoginScreen.styles';

// The look of the sign-up screen, the same as the web's on a phone: a header with the back arrow and the title in a
// 56px row, as tall as a full-screen dialog's, under 12px of room, the fields 14px apart with 24px gutters, and at the
// bottom of the screen "Criar conta" across with "Já tem conta? Entrar" under it, "Entrar" in the accent.

/**
 * The sign-up screen: the page and its content, the header with its title, and the form with its alert and actions,
 * "Entrar" set apart in the way back to the login.
 */
export const useStyles = createStyles(
  'auth.register-screen',
  {
    page: '',
    header: 'header',
    headerTitle: 'header.title',
    form: 'form',
    alert: 'form.alert',
    actions: 'form.actions',
    loginAction: 'form.actions.login.action',
  },
  (theme) => {
    const auth = authScreenStyles();
    return {
      ...auth,
      actions: { marginTop: 'auto', gap: scales.space.s1, paddingTop: scales.space.s4 },
      content: { ...auth.content, justifyContent: 'flex-start', gap: 0, padding: 0, paddingBottom: scales.space.s6 - scales.space.s1 },
      form: { flexGrow: 1, gap: scales.space.s3 + scales.space.s1 / 2, paddingHorizontal: scales.space.s5, paddingTop: scales.space.s4 },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scales.space.s1,
        minHeight: DIALOG_HEADER_HEIGHT + scales.space.s3 + scales.space.s1,
        paddingTop: scales.space.s3,
        paddingBottom: scales.space.s1,
        paddingLeft: scales.space.s1,
        paddingRight: scales.space.s4,
      },
      headerTitle: {
        fontFamily: fontFamily(theme.displayFont, 700),
        fontSize: REGISTER_TITLE,
        letterSpacing: theme.displayTracking * REGISTER_TITLE,
        textTransform: 'uppercase',
        color: theme.colors.text,
      },
      loginAction: { fontFamily: fontFamily(scales.bodyFont, 600), color: theme.colors.accent },
    };
  },
);
