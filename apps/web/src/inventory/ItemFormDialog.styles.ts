import { recipe, tv } from '../styles/tv.ts'

// The look of the item form, inside its Dialog: the fields in two columns from sm, one below, the photos across both,
// and the position and side choices each with its label over it. The details use the same layout, with the values as
// text. The Dialog draws the window, so the base has no classes; the photos' cell only places the ImageUpload, which
// keeps its own id.

/** The item form: its fields grid, the photos' cell and the labeled choices. */
export const itemFormDialog = recipe(
  'inventory.item-form-dialog',
  tv({
    slots: {
      base: '',
      fields: 'grid items-start gap-x-4 gap-y-3 sm:grid-cols-2',
      photos: 'sm:col-span-2',
      choice: 'grid content-start gap-1.5',
    },
  }),
  { base: '', fields: 'fields', photos: 'fields.photos', choice: 'fields.choice' },
)
