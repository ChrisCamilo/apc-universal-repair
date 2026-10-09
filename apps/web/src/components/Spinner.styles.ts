import { recipe, tv } from '../styles/tv.ts'

// The look of the spinner: a ring in the color of the text around it, open on one side, turning, or fading softly
// in and out with reduced motion. "sm" follows the size of the text it sits in, "md" stands on its own.

/** The spinner's ring, by size. */
export const spinner = recipe(
  'common.spinner',
  tv({
    slots: {
      base: 'inline-block shrink-0 rounded-pill border-2 border-current border-r-transparent motion-safe:animate-spin motion-reduce:animate-pulse',
    },
    variants: { size: { sm: { base: 'size-[1em]' }, md: { base: 'size-6' } } },
    defaultVariants: { size: 'md' },
  }),
  { base: '' },
)
