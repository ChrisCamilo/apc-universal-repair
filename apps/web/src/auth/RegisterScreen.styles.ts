import { recipe, tv } from '../styles/tv.ts'
import { AUTH_SCREEN_PATHS, AUTH_SCREEN_SLOTS } from './LoginScreen.styles.ts'

// The look of the sign-up screen: the login's, with the longer form in the same place.
// On a phone (below `card:`) it is one column instead, as the native app draws it: no badge, but a header with the
// back arrow and the title in a 56px row under 12px of room, the fields 14px apart with 24px gutters, and at the
// bottom of the screen "Criar conta" across with "Já tem conta? Entrar" centered under it, "Entrar" in the accent.

/**
 * The sign-up screen: the page, the badge's panel and heading, and the form with its actions; and on a phone, the
 * header with its title, the submit across and the way back to the login.
 */
export const registerScreen = recipe(
  'auth.register-screen',
  tv({
    slots: {
      ...AUTH_SCREEN_SLOTS,
      base: `${AUTH_SCREEN_SLOTS.base} max-card:place-items-stretch max-card:p-0`,
      layout: `${AUTH_SCREEN_SLOTS.layout} max-card:flex max-card:min-h-[calc(100dvh-var(--top-inset,0px))] max-card:flex-col max-card:items-stretch max-card:gap-0`,
      brand: `${AUTH_SCREEN_SLOTS.brand} max-card:hidden`,
      form: `${AUTH_SCREEN_SLOTS.form} max-card:flex max-card:max-w-none max-card:flex-1 max-card:flex-col max-card:gap-3.5 max-card:px-6 max-card:pt-4 max-card:pb-7`,
      actions: `${AUTH_SCREEN_SLOTS.actions} max-card:mt-auto max-card:flex max-card:flex-col max-card:items-stretch max-card:gap-1 max-card:pt-4`,
      header: 'flex min-h-18 items-center gap-1 pt-3 pr-4 pb-1 pl-1 card:hidden',
      // REGISTER_TITLE: 22px in the display face.
      headerTitle: 'm-0 font-display text-[22px]/7 font-bold uppercase tracking-display text-text',
      submit: 'max-card:w-full',
      login: 'max-card:min-h-11',
      // "Já tem conta?" stays muted while "Entrar" takes the accent, on a phone.
      loginAction: 'max-card:font-semibold max-card:text-accent',
    },
  }),
  {
    ...AUTH_SCREEN_PATHS,
    header: 'header',
    headerTitle: 'header.title',
    submit: 'form.actions.submit',
    login: 'form.actions.login',
    loginAction: 'form.actions.login.action',
  },
)
