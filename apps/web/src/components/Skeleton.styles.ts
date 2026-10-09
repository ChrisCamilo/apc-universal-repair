import type { CSSProperties } from 'react'
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

/**
 * Sizes a placeholder as its holder asks; a circle is as tall as it is wide.
 * @param shape The placeholder's shape.
 * @param width CSS width.
 * @param height CSS height.
 * @returns The placeholder's width and height.
 */
export function skeletonBox(shape: 'block' | 'circle' | 'line', width: CSSProperties['width'], height: CSSProperties['height']): CSSProperties {
  return { width, height: shape === 'circle' ? width : height }
}
