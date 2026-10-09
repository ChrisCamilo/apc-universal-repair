import { DISPLAY_LABEL } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of the compact single choice: options in a hairline pill on the panel, the chosen one filled with the accent
// and glowing where the style has a glow. Inside a Menu it sits in a labeled row, and its options pack tighter so four
// fit the menu's width on one line.

/** A segmented choice: the menu row with its label and description, the group, and an option, chosen or not. */
export const segmented = recipe(
  'common.segmented',
  tv({
    slots: {
      base: 'inline-flex gap-0.5 rounded-pill border border-hairline bg-panel p-0.5',
      option: `cursor-pointer rounded-pill py-1 text-xs ${DISPLAY_LABEL} outline-none transition-[background-color,color,box-shadow] focus-visible:shadow-ring`,
      row: 'flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-2 py-2 font-body text-sm text-text',
      text: 'grid',
      description: 'text-xs leading-snug text-text-muted',
    },
    variants: {
      inMenu: { true: { option: 'px-2' }, false: { option: 'px-3' } },
      on: { true: { option: 'bg-accent text-on-accent shadow-glow' }, false: { option: 'text-text-muted hover:text-text' } },
    },
    defaultVariants: { inMenu: false, on: false },
  }),
  { base: '', option: 'option', row: 'row', text: 'row.text', description: 'row.text.description' },
)
