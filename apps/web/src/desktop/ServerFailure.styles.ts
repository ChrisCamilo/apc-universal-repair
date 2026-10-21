import { recipe, tv } from '../styles/tv.ts'

// The look of the screen that says the desktop app's server isn't on: it covers the whole window in the page's opaque
// background, over the login and every route and what they show, with its message centered; for a taken port the ways
// out of it under the message, side by side, wrapping on a narrow window; and for a key that doesn't open the data,
// the recovery copy's field and its button, as wide as a form's field, with its note under it.

/** The screen, its content, the taken port's buttons, and the recovery copy's form and note. */
export const serverFailure = recipe(
  'setup.server-failure',
  tv({
    slots: {
      base: 'fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-canvas p-6',
      content: 'grid justify-items-center gap-3',
      more: 'flex flex-wrap justify-center gap-2',
      recovery: 'grid w-full max-w-md gap-2',
      note: 'm-0 font-body text-sm text-danger',
    },
  }),
  { base: '', content: 'content', more: 'content.more', recovery: 'content.recovery', note: 'content.recovery.note' },
)
