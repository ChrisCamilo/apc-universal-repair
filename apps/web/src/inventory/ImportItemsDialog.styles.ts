import { recipe, tv } from '../styles/tv.ts'

// The look of the CSV import, inside its Dialog: the file buttons in a wrapping row; the reading error in the danger
// color; and the preview, with the names to create and each row of the file over a soft hairline, its line, code and
// name in a wrapping head, a row with errors marked by a danger stripe at its start (the DOM marks it with
// data-invalid) and its reasons in the danger color. The Dialog draws the window, so the base has no classes; the
// list only holds the rows, so it adds no level to their ids, which are the same as on mobile.

/** The import: the buttons and the file input, the reading error, and the preview with its names and rows. */
export const importItemsDialog = recipe(
  'inventory.import-items-dialog',
  tv({
    slots: {
      base: '',
      buttons: 'flex flex-wrap gap-2',
      picker: 'hidden',
      problem: 'm-0 font-body text-sm text-danger',
      preview: 'grid gap-3',
      creates: 'grid gap-1',
      rows: 'm-0 grid list-none p-0',
      row: 'grid gap-0.5 border-b border-hairline-soft py-2 data-invalid:border-l-2 data-invalid:border-l-danger data-invalid:pl-3',
      head: 'flex min-w-0 flex-wrap items-baseline gap-x-2',
      line: 'font-mono text-xs text-text-muted',
      code: 'font-mono text-xs text-text',
      name: 'min-w-0 truncate font-body text-sm font-semibold text-text',
      error: 'm-0 font-body text-sm text-danger',
    },
  }),
  {
    base: '',
    buttons: 'buttons',
    picker: 'buttons.picker',
    problem: 'problem',
    preview: 'preview',
    creates: 'preview.creates',
    rows: 'preview.rows',
    row: 'preview.row',
    head: 'preview.row.head',
    line: 'preview.row.head.line',
    code: 'preview.row.head.code',
    name: 'preview.row.head.name',
    error: 'preview.row.error',
  },
)
