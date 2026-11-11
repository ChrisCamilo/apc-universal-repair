import { DISPLAY_LABEL } from '../../styles/shared.ts'
import { recipe, tv } from '../../styles/tv.ts'

// The look of an engine's sheet as a form, in the Catalog's detail column: a muted label over the title it will have,
// the year it takes from the tree in a dashed box, the displacement and cylinders side by side, the drive and the
// summary, then how the engine will read in the tree and its readouts; Cancelar and Salvar ficha stay at the bottom of
// the column while it scrolls, on the panel's fill under a soft hairline.

/** The sheet's form: its heading, the year from the tree, the two short fields, the drive, the preview and the action bar. */
export const engineSheetForm = recipe(
  'catalog.engine-sheet-form',
  tv({
    slots: {
      base: 'grid gap-4',
      head: 'grid gap-1',
      kicker: `m-0 text-xs text-text-muted ${DISPLAY_LABEL}`,
      fromTree: 'm-0 rounded-tile border border-dashed border-hairline px-3 py-2 font-body text-sm text-text-muted',
      pair: 'grid grid-cols-2 gap-3',
      drive: 'grid gap-1.5',
      preview: 'grid gap-1.5',
      readouts: 'flex flex-wrap items-center gap-x-3 gap-y-1',
      problem: 'm-0 font-body text-sm text-danger',
      actions: '-mx-3 -mb-3 sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-hairline-soft bg-panel px-3 pt-3 pb-3',
    },
  }),
  {
    base: '',
    head: 'head',
    kicker: 'head.kicker',
    fromTree: 'from-tree',
    pair: 'pair',
    drive: 'drive',
    preview: 'preview',
    readouts: 'preview.readouts',
    problem: 'drive.problem',
    actions: 'actions',
  },
)
