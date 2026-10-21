import { recipe, tv } from '../styles/tv.ts'

// The look of the screen that says the desktop app's server isn't on: it covers the whole window in the page's
// background, over the login and every route, with its message centered, and for a taken port the ways out of it
// under the message, side by side, wrapping on a narrow window.

/** The screen, its content and the taken port's buttons. */
export const serverFailure = recipe(
  'setup.server-failure',
  tv({
    slots: {
      base: 'fixed inset-0 z-50 grid place-items-center bg-bg p-6',
      content: 'grid justify-items-center gap-3',
      more: 'flex flex-wrap justify-center gap-2',
    },
  }),
  { base: '', content: 'content', more: 'content.more' },
)
