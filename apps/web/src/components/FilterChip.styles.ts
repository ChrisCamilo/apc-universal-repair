import { DISPLAY_LABEL } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of the quick-filter chips: a soft hairline pill in the muted display face that lights up in the accent when
// on (aria-pressed), and the group they wrap in.

/** A chip, by size. */
export const filterChip = recipe(
  'common.filter-chip',
  tv({
    slots: {
      base: [
        `cursor-pointer rounded-pill border border-hairline-soft bg-transparent text-xs ${DISPLAY_LABEL} text-text-muted outline-none`,
        'transition-[color,border-color,background-color,box-shadow] not-aria-pressed:hover:border-hairline not-aria-pressed:hover:text-text',
        'focus-visible:shadow-ring aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent',
      ],
    },
    variants: { size: { md: 'px-3 py-1', sm: 'px-2.5 py-0.5' } },
    defaultVariants: { size: 'md' },
  }),
  { base: '' },
)

/** A group of chips, wrapping. */
export const filterChipGroup = recipe('common.filter-chip-group', tv({ slots: { base: 'inline-flex flex-wrap gap-1.5' } }), { base: '' })
