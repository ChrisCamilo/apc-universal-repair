import { recipe, tv } from '../styles/tv.ts'
import { AUTH_SCREEN_PATHS, AUTH_SCREEN_SLOTS } from './LoginScreen.styles.ts'

// The look of the sign-up screen: the login's, with the longer form in the same place.

/** The sign-up screen: the page, the badge's panel and heading, and the form with its actions. */
export const registerScreen = recipe('auth.register-screen', tv({ slots: AUTH_SCREEN_SLOTS }), AUTH_SCREEN_PATHS)
