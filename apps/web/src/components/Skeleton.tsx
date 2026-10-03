import type { CSSProperties } from 'react'

// A placeholder block in the shape of what is still loading, e.g. tree rows or the detail panel: a soft
// hairline fill that pulses gently, standing still with reduced motion. Lines are pills, blocks take the tile
// radius and circles are round. Skeletons are hidden from screen readers: the region they fill should be
// marked busy and say it is loading, e.g. with a Spinner label.

const SHAPE_CLASSES = { line: 'h-3 rounded-pill', block: 'rounded-tile', circle: 'rounded-pill' }

type SkeletonProps = {
  shape?: keyof typeof SHAPE_CLASSES
  /** CSS width, e.g. "60%" or 120 (px); defaults to the full width. */
  width?: CSSProperties['width']
  /** CSS height; lines have their own, blocks need one and circles take their width. */
  height?: CSSProperties['height']
  className?: string
}

export function Skeleton({ shape = 'line', width = '100%', height, className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      data-skeleton={shape}
      className={['block shrink-0 bg-hairline-soft motion-safe:animate-pulse', SHAPE_CLASSES[shape], className].filter(Boolean).join(' ')}
      style={{ width, height: shape === 'circle' ? width : height }}
    />
  )
}
