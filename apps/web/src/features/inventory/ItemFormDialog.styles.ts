import { recipe, tv } from '../../styles/tv.ts'

// The look of the item form, inside its Dialog: the item's fields in two columns from sm, one below, its vehicles
// across both columns, a line each of its brand, its model, its generation, its version and its trash, the position and side choices each with
// its label over it, and its original codes across both columns; then the brands across both columns, each a framed section
// with its heading (and its trash) over its photos and its fields, in the same two columns, and "Adicionar marca"
// after them. The details use the same layout, with the values as text. The Dialog draws the window, so the base has
// no classes; the photos' cell only places the ImageUpload, which keeps its own id. The vehicles' columns start at no
// width, so a line's four fields share the dialog's width and shrink in it instead of scrolling it sideways; a
// line's trash sits in a cell as tall as a field's frame, centered on it. A phone's details share the bottom between
// Duplicar and Editar, and a phone's form, as in the Novo item mockup, has its fields in one column 16px apart, each
// brand a raised card in two columns, its heading, photos, part brand and code across both, "Adicionar marca" across
// the width, and "Salvar item" across the bottom.

/** The item form: its fields grid, the labeled choices, the brands' sections and their photos' cells. */
export const itemFormDialog = recipe(
  'inventory.item-form-dialog',
  tv({
    slots: {
      base: '',
      fields: 'grid items-start',
      choice: 'grid content-start gap-1.5',
      codes: 'sm:col-span-2',
      vehicles: 'grid grid-cols-1 gap-3 sm:col-span-2',
      vehicle: 'grid grid-cols-1 items-end gap-x-4 gap-y-3 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto]',
      removeVehicle: 'flex h-11.5 items-center',
      addVehicle: 'flex',
      brands: 'grid gap-3 sm:col-span-2',
      brand: 'grid items-start rounded-tile border border-hairline-soft',
      brandHead: 'flex items-center justify-between gap-2',
      photos: '',
      wide: '',
      add: '',
      action: 'flex-1',
    },
    variants: {
      phone: {
        true: {
          fields: 'gap-4',
          brands: 'gap-4',
          brand: 'mt-2 grid-cols-2 gap-x-2.5 gap-y-3.5 bg-panel-raised px-3.5 py-4',
          brandHead: 'col-span-2',
          photos: 'col-span-2',
          wide: 'col-span-2',
          add: 'grid',
        },
        false: {
          fields: 'gap-x-4 gap-y-3 sm:grid-cols-2',
          brand: 'gap-x-4 gap-y-3 p-3 sm:grid-cols-2',
          brandHead: 'sm:col-span-2',
          photos: 'sm:col-span-2',
          add: 'flex',
        },
      },
    },
    defaultVariants: { phone: false },
  }),
  {
    base: '',
    fields: 'fields',
    choice: 'fields.choice',
    codes: 'fields.codes',
    vehicles: 'fields.vehicles',
    vehicle: 'fields.vehicles.vehicle',
    removeVehicle: 'fields.vehicles.vehicle.remove',
    addVehicle: 'fields.vehicles.add',
    brands: 'fields.brands',
    brand: 'fields.brands.brand',
    brandHead: 'fields.brands.brand.head',
    photos: 'fields.brands.brand.photos',
    wide: 'fields.brands.brand.wide',
    add: 'fields.brands.add',
    action: 'action',
  },
)
