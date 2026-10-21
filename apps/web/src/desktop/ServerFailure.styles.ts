import { recipe, tv } from '../styles/tv.ts'

// The look of the screen that says the desktop app's server isn't on: it covers the whole window in the page's
// background, over the login and every route, with its message centered.

/** The screen. */
export const serverFailure = recipe(
  'setup.server-failure',
  tv({
    slots: {
      base: 'fixed inset-0 z-50 grid place-items-center bg-bg p-6',
    },
  }),
  { base: '' },
)
