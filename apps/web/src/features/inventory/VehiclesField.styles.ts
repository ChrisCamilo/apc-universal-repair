import { recipe, tv } from '../../styles/tv.ts'

// The look of a phone's vehicles in the item form, as in the Novo item mockup: the chips wrap in rows, each a 44px
// accent-soft pill with the vehicle and a 44px muted × that brightens on hover; the new vehicle's fields sit in a soft
// hairline frame with Cancelar and Adicionar at its end; "Adicionar veículo" takes the whole width; a message is in the
// danger color.

/** A phone's vehicles: the field, the chips, a chip and its ×, the new vehicle with its buttons, the add button and a message. */
export const vehiclesField = recipe(
  'inventory.vehicles-field',
  tv({
    slots: {
      base: 'grid gap-2',
      chips: 'm-0 flex list-none flex-wrap gap-2 p-0',
      chip: 'flex h-11 items-center gap-1 rounded-pill bg-accent-soft pl-3.5 font-body text-[15px] text-text',
      remove: [
        'grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill border-0 bg-transparent p-0 text-text-muted outline-none',
        'transition-colors hover:text-text focus-visible:shadow-ring',
      ],
      draft: 'grid gap-3 rounded-tile border border-hairline-soft p-3',
      draftActions: 'flex justify-end gap-2',
      add: 'grid',
      error: 'm-0 font-body text-sm text-danger',
    },
  }),
  {
    base: '',
    chips: 'chips',
    chip: 'chips.chip',
    remove: 'chips.chip.remove',
    draft: 'draft',
    draftActions: 'draft.actions',
    add: 'add',
    error: 'error',
  },
)
