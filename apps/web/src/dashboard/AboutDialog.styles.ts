import { recipe, tv } from '../styles/tv.ts'

// The look of "Sobre esta versão", inside its Dialog: the version and the link to every release on one row, which
// wraps on a phone, over the notes. The Dialog draws the window, so the base has no classes.

/** The dialog's content: the row with the version and the link. */
export const aboutDialog = recipe(
  'dashboard.about-dialog',
  tv({ slots: { base: '', version: 'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1' } }),
  { base: '', version: 'version' },
)
