import { recipe, tv } from '../../styles/tv.ts'

// The look of the row that adds or renames a node of the Catalog's tree: its fields side by side, the name taking the
// room left and a year as wide as four digits, with ✓ and ✕ at the end, lined up with the fields' boxes; the row wraps
// when the tree is narrow.

/** The row: the form, the name field, a year field and the two buttons. */
export const nodeForm = recipe(
  'catalog.node-form',
  tv({
    slots: {
      base: 'flex flex-wrap items-end gap-2 py-1',
      name: 'min-w-40 flex-1',
      year: 'w-24',
      buttons: 'flex items-center gap-0.5 pb-1',
    },
  }),
  { base: '', name: 'name', year: 'year', buttons: 'buttons' },
)
