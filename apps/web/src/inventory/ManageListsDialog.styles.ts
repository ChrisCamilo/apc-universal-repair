import { recipe, tv } from '../styles/tv.ts'

// The look of "Gerenciar listas", inside its Dialog: a section per list, the vehicle models grouped by brand, and each
// name in a row over a soft hairline, with its item count in mono and its pencil and trash at the end; a name being
// renamed turns into its field, with Salvar and Cancelar at the end. The Dialog draws the window, so the base has no
// classes; the lists and the model groups only hold the rows, so they add no level to their ids, which are the same as
// on mobile.

/** The lists: their sections, model groups and rows, and the rename row with its buttons. */
export const manageListsDialog = recipe(
  'inventory.manage-lists-dialog',
  tv({
    slots: {
      base: '',
      section: 'grid gap-1',
      group: 'grid pt-2',
      rows: 'm-0 grid list-none p-0',
      entry: 'flex min-h-11 items-center gap-2 border-b border-hairline-soft py-1',
      name: 'min-w-0 flex-1 truncate font-body text-base text-text',
      uses: 'shrink-0 font-mono text-xs tabular-nums text-text-muted',
      actions: 'inline-flex shrink-0 gap-0.5',
      rename: 'grid gap-2 border-b border-hairline-soft py-2',
      buttons: 'flex justify-end gap-2',
    },
  }),
  {
    base: '',
    section: 'section',
    group: 'section.group',
    rows: 'section.rows',
    entry: 'section.entry',
    name: 'section.entry.name',
    uses: 'section.entry.uses',
    actions: 'section.entry.actions',
    rename: 'section.rename',
    buttons: 'section.rename.buttons',
  },
)
