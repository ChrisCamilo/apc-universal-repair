import { recipe, tv } from '../../styles/tv.ts'

// The look of the devices' dialogs on the server's computer: the approval's short code, large in the mono face and
// spaced to read out and compare with the device's; and the list of devices, one per row with its name over who uses
// it and when, its actions beside it, and the note under the list in the danger color for what went wrong.

/** The approval and the list: the code, the rows with their name, details and actions, and the note. */
export const devices = recipe(
  'setup.devices',
  tv({
    slots: {
      base: 'grid gap-4',
      code: 'm-0 font-mono text-3xl tracking-[0.3em] text-text select-all',
      list: 'm-0 grid list-none gap-0 p-0',
      row: 'flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline-soft py-3 first:border-t-0',
      about: 'grid min-w-0 flex-1 basis-48 gap-0.5',
      actions: 'flex flex-wrap gap-2',
      note: 'm-0 font-body text-sm text-danger',
    },
  }),
  {
    base: '',
    code: 'code',
    list: 'list',
    row: 'list.row',
    about: 'list.row.about',
    actions: 'list.row.actions',
    note: 'note',
  },
)
