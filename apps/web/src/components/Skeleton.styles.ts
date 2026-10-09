import { recipe, tv } from '../styles/tv.ts'

// The look of a loading placeholder: a soft hairline fill that pulses gently, standing still with reduced motion.
// Lines are pills, blocks take the tile radius and circles are round. Its size comes from the holder.

/** A placeholder, by shape. */
export const skeleton = recipe(
  'common.skeleton',
  tv({
    slots: { base: 'block shrink-0 bg-hairline-soft motion-safe:animate-pulse' },
    variants: { shape: { line: 'h-3 rounded-pill', block: 'rounded-tile', circle: 'rounded-pill' } },
    defaultVariants: { shape: 'line' },
  }),
  { base: '' },
)
