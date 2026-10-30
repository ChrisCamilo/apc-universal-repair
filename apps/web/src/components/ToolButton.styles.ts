import { recipe, tv } from '../styles/tv.ts'

// The look of a round icon button in a phone's toolbar: a 44px pill on the panel with a hairline, the icon in the text
// color, turning to the accent on hover. While what it opens is on, such as a filter, it takes the accent, its fill
// the soft accent, with a dot at its top right.

/** A round toolbar button and its dot, at rest or on. */
export const toolButton = recipe(
  'common.tool-button',
  tv({
    slots: {
      base: [
        'relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill border p-0 outline-none',
        'transition-[background-color,color,border-color,box-shadow] focus-visible:shadow-ring',
      ],
      dot: 'absolute top-1 right-1 size-2 rounded-pill bg-accent',
    },
    variants: {
      active: {
        true: { base: 'border-accent bg-accent-soft text-accent' },
        false: { base: 'border-hairline bg-panel text-text hover:border-accent hover:text-accent' },
      },
    },
    defaultVariants: { active: false },
  }),
  { base: '', dot: 'dot' },
)
