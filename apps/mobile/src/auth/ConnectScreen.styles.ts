import { REGISTER_TITLE } from '@apc/shared/auth';
import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';
import { fontFamily } from '../theme';
import { authScreenStyles } from './LoginScreen.styles';

// The look of Conectar ao servidor, like the login's: one column, centered, no wider than the web's form, the title as
// the sign-up's, with the ← before it when there is a server to go back to, over what to do on the computer; then the
// camera's square, framed and rounded like a tile, or what lets the camera on, or in its place the address and the
// code to type in; and the buttons across under them, "Conectar" first while typing, then the one that swaps the
// camera and the fields.

/** Conectar ao servidor: the page, the heading and its title, the camera or the form, the alert and the buttons. */
export const useStyles = createStyles(
  'auth.connect-screen',
  {
    page: '',
    heading: 'heading',
    title: 'heading.title',
    titleText: 'heading.title.text',
    camera: 'camera',
    scanner: 'camera.scanner',
    alert: 'alert',
    form: 'form',
    actions: 'actions',
  },
  (theme) => {
    const auth = authScreenStyles();
    return {
      ...auth,
      content: { ...auth.content, justifyContent: 'flex-start', paddingTop: scales.space.s6 },
      heading: { gap: scales.space.s2 },
      camera: {
        aspectRatio: 1,
        width: '100%',
        borderRadius: theme.radiusTile,
        borderWidth: 1,
        borderColor: theme.colors.hairline,
        backgroundColor: theme.colors.panel,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scales.space.s3,
        padding: scales.space.s4,
      },
      scanner: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
      title: { flexDirection: 'row', alignItems: 'center', gap: scales.space.s1 },
      // The ←'s 44px circle reaches past the gutter, so its arrow lines up with the sign-up's.
      titleWithBack: { marginLeft: -scales.space.s3 },
      titleText: {
        flexShrink: 1,
        fontFamily: fontFamily(theme.displayFont, 700),
        fontSize: REGISTER_TITLE,
        letterSpacing: theme.displayTracking * REGISTER_TITLE,
        textTransform: 'uppercase',
        color: theme.colors.text,
      },
    };
  },
);
