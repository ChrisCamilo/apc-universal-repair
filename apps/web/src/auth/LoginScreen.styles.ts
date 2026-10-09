import { recipe, tv } from '../styles/tv.ts'

// The look of the login and sign-up screens: the badge on a panel beside the form, or above it, smaller, on phones
// and narrow screens, all centered on the page. The layout only places the badge and the form, so it adds no level to
// their ids, which are the same as on mobile.

/** Each part's path in an auth screen. */
export const AUTH_SCREEN_PATHS = {
  base: '',
  layout: 'layout',
  brand: 'brand',
  title: 'brand.title',
  mark: 'brand.title.mark',
  form: 'form',
  actions: 'form.actions',
}
/** The parts of an auth screen: the page, the badge's panel and heading, and the form with its actions. */
export const AUTH_SCREEN_SLOTS = {
  base: 'grid min-h-dvh place-items-center px-4 py-8 sm:px-6',
  layout: 'grid w-full max-w-4xl items-center gap-6 md:grid-cols-2 md:gap-12',
  brand: 'grid place-items-center py-6 md:py-12',
  title: 'm-0 flex',
  mark: 'h-auto w-36 md:w-56',
  form: 'grid w-full max-w-sm gap-4 max-md:justify-self-center',
  actions: 'grid justify-items-start gap-2',
}

/** The login screen: the page, the badge's panel and heading, and the form with its actions. */
export const loginScreen = recipe('auth.login-screen', tv({ slots: AUTH_SCREEN_SLOTS }), AUTH_SCREEN_PATHS)
