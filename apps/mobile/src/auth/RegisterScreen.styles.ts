import { createStyles } from '../styles/createStyles';
import { AUTH_SCREEN_PATHS, authScreenStyles } from './LoginScreen.styles';

// The look of the sign-up screen: the login's, with the longer form in the same place.

/** The sign-up screen: the page and its content, the badge's panel and heading, and the form with its alert and actions. */
export const useStyles = createStyles('auth.register-screen', AUTH_SCREEN_PATHS, authScreenStyles);
