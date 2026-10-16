import { recipe, tv } from '../styles/tv.ts'

// The look of the desktop app's Servidor dialog, inside its Dialog: the settings as a list of terms and values, the
// term muted over its value in the mono face, paths and addresses breaking anywhere; each section, Banco de dados and
// Importar, apart from the list with a soft hairline above it; a file or folder button with its path beside it,
// wrapping; the note under a section in the danger color for what went wrong, in the text color for what was done;
// and the import's copied rows, one per line. The Dialog draws the window, so the base has no classes.

/** The dialog's content: the settings, the sections with their pickers, buttons and notes, and the import's rows. */
export const serverSettings = recipe(
  'setup.server-settings',
  tv({
    slots: {
      base: '',
      facts: 'm-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1',
      term: 'font-body text-sm text-text-muted',
      value: 'm-0 min-w-0 font-mono text-sm break-all text-text',
      section: 'grid gap-3 border-t border-hairline-soft pt-4',
      pick: 'flex flex-wrap items-center gap-x-3 gap-y-1 break-all',
      buttons: 'flex flex-wrap gap-2 empty:hidden',
      note: 'm-0 font-body text-sm',
      results: 'm-0 grid list-none gap-0.5 p-0',
      result: 'font-body text-sm text-text',
    },
    variants: {
      tone: { danger: { note: 'text-danger' }, done: { note: 'text-text' } },
    },
  }),
  {
    base: '',
    facts: 'facts',
    term: 'facts.term',
    value: 'facts.value',
    section: 'section',
    pick: 'section.pick',
    buttons: 'section.buttons',
    note: 'section.note',
    results: 'section.results',
    result: 'section.results.result',
  },
)
