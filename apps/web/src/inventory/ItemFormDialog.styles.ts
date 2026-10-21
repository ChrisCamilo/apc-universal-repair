import { recipe, tv } from '../styles/tv.ts'

// The look of the item form, inside its Dialog: the item's fields in two columns from sm, one below, and the
// position and side choices each with its label over it; then the brands across both columns, each a framed section
// with its heading (and its Remover) over its photos and its fields, in the same two columns, and "Adicionar marca"
// after them. The details use the same layout, with the values as text. The Dialog draws the window, so the base has
// no classes; the photos' cell only places the ImageUpload, which keeps its own id.

/** The item form: its fields grid, the labeled choices, the brands' sections and their photos' cells. */
export const itemFormDialog = recipe(
  'inventory.item-form-dialog',
  tv({
    slots: {
      base: '',
      fields: 'grid items-start gap-x-4 gap-y-3 sm:grid-cols-2',
      choice: 'grid content-start gap-1.5',
      brands: 'grid gap-3 sm:col-span-2',
      brand: 'grid items-start gap-x-4 gap-y-3 rounded-tile border border-hairline-soft p-3 sm:grid-cols-2',
      brandHead: 'flex items-center justify-between gap-2 sm:col-span-2',
      photos: 'sm:col-span-2',
      add: 'flex',
    },
  }),
  {
    base: '',
    fields: 'fields',
    choice: 'fields.choice',
    brands: 'fields.brands',
    brand: 'fields.brands.brand',
    brandHead: 'fields.brands.brand.head',
    photos: 'fields.brands.brand.photos',
    add: 'fields.brands.add',
  },
)
