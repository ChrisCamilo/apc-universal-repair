import { recipe, tv } from '../styles/tv.ts'

// The look of the demo's notice: a thin bar above the app, on the raised panel over a soft hairline, its line in small
// muted text, wrapping on a phone, and the repository's link in the accent.

/** The notice: the bar, its text and the link. */
export const demoNotice = recipe(
  'setup.demo-notice',
  tv({
    slots: {
      base: 'flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 border-b border-hairline-soft bg-panel-raised px-4 py-1.5 text-center',
      text: 'm-0 font-body text-xs text-text-muted',
      link: 'font-body text-xs text-accent underline underline-offset-4 hover:text-text',
    },
  }),
  { base: '', text: 'text', link: 'link' },
)
