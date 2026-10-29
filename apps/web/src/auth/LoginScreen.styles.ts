import { recipe, tv } from '../styles/tv.ts'

// The look of the login and sign-up screens: the badge on a panel beside the form, or above it, smaller, on phones
// and narrow screens, all centered on the window, less the room the page keeps above the app (--top-inset, the web
// app's demo's notice). The layout only places the badge and the form, so it adds no level to
// their ids, which are the same as on mobile.
// On a phone (below `card:`) the login is one column instead, as the native app draws it: the APC mark and the name
// over the tagline, centered on top, what the login asks for, the form with "Esqueceu a senha?" right under the
// password and "Entrar" across, and "Criar conta" at the bottom of the screen.

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
  base: 'grid min-h-[calc(100dvh-var(--top-inset,0px))] place-items-center px-4 py-8 sm:px-6',
  layout: 'grid w-full max-w-4xl items-center gap-6 md:grid-cols-2 md:gap-12',
  brand: 'grid place-items-center py-6 md:py-12',
  title: 'm-0 flex',
  mark: 'h-auto w-36 md:w-56',
  form: 'grid w-full max-w-sm gap-4 max-md:justify-self-center',
  actions: 'grid justify-items-start gap-2',
}

/**
 * The login screen: the page, the badge's panel and heading, and the form with its actions; and on a phone, the brand
 * heading with the name and the tagline, what the login asks for, the forgotten password's and the submit's places in
 * the actions, and the question and button that open the sign-up at the bottom.
 */
export const loginScreen = recipe(
  'auth.login-screen',
  tv({
    slots: {
      ...AUTH_SCREEN_SLOTS,
      base: `${AUTH_SCREEN_SLOTS.base} max-card:place-items-stretch max-card:px-6 max-card:py-0`,
      layout: `${AUTH_SCREEN_SLOTS.layout} max-card:flex max-card:min-h-[calc(100dvh-var(--top-inset,0px))] max-card:flex-col max-card:items-stretch max-card:pt-14 max-card:pb-8`,
      brand: `${AUTH_SCREEN_SLOTS.brand} max-card:hidden`,
      form: `${AUTH_SCREEN_SLOTS.form} max-card:max-w-none`,
      actions: `${AUTH_SCREEN_SLOTS.actions} max-card:flex max-card:flex-col max-card:items-stretch max-card:gap-4`,
      heading: 'grid justify-items-center gap-2.5 card:hidden',
      // LOGIN_BRAND: the name at 44px over the tagline at 17px, spaced 0.24em.
      headingTitle: 'm-0 flex flex-col items-center gap-1 text-center',
      name: 'font-display text-[44px]/[44px] font-bold uppercase tracking-display text-text',
      tagline: 'font-display text-[17px]/[20px] font-semibold uppercase tracking-[0.24em] text-text-muted',
      intro: 'mt-7.5 text-center',
      forgot: 'max-card:order-first max-card:-mt-2 max-card:min-h-11 max-card:self-end',
      submit: 'max-card:w-full',
      // The desktop's "Criar conta" link, which the phone has at the bottom instead.
      registerLink: 'max-card:hidden',
      account: 'grid gap-2.5 text-center card:hidden max-card:mt-auto',
      accountButton: 'w-full',
    },
  }),
  {
    ...AUTH_SCREEN_PATHS,
    heading: 'heading',
    headingTitle: 'heading.title',
    name: 'heading.title.name',
    tagline: 'heading.title.tagline',
    intro: 'heading.intro',
    forgot: 'form.actions.forgot',
    submit: 'form.actions.submit',
    registerLink: 'form.actions.register',
    account: 'account',
    accountButton: 'account.register',
  },
)
