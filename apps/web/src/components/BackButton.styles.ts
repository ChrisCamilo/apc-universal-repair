import { recipe, tv } from '../styles/tv.ts'

// The look of the ←: a bare 44px circle around the arrow, as tall as a finger needs, that fills in and turns to the
// accent on hover.

/** The round ← that goes back a screen. */
export const backButton = recipe(
  'common.back-button',
  tv({
    slots: {
      base: [
        'grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill border-0 bg-transparent p-0 text-text outline-none',
        'transition-colors hover:bg-panel-raised hover:text-accent focus-visible:shadow-ring',
      ],
    },
  }),
  { base: '' },
)
