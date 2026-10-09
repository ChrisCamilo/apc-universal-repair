import { recipe, tv } from '../styles/tv.ts'

// The look of the ×: a round hairline ring around the icon that turns to the accent on hover.

/** The round × that closes a window. */
export const closeButton = recipe(
  'common.close-button',
  tv({
    slots: {
      base: [
        'grid size-9 shrink-0 cursor-pointer place-items-center rounded-pill border border-hairline-soft text-text outline-none',
        'transition-colors hover:border-accent hover:text-accent focus-visible:shadow-ring',
      ],
    },
  }),
  { base: '' },
)
