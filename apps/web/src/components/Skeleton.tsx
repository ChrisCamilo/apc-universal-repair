import type { CSSProperties } from 'react'
import { skeleton } from './Skeleton.styles.ts'

// A placeholder block in the shape of what is still loading, e.g. tree rows or the detail panel: a soft
// hairline fill that pulses gently, standing still with reduced motion. Lines are pills, blocks take the tile
// radius and circles are round. Skeletons are hidden from screen readers: the region they fill should be
// marked busy and say it is loading, e.g. with a Spinner label.

type SkeletonProps = {
  shape?: 'line' | 'block' | 'circle'
  /** CSS width, e.g. "60%" or 120 (px); defaults to the full width. */
  width?: CSSProperties['width']
  /** CSS height; lines have their own, blocks need one and circles take their width. */
  height?: CSSProperties['height']
  className?: string
}

export function Skeleton({ shape = 'line', width = '100%', height, className }: SkeletonProps) {
  const { classes, ids } = skeleton({ shape })
  return (
    <span
      aria-hidden="true"
      data-skeleton={shape}
      className={classes.base({ class: className })}
      data-testid={ids.base}
      style={{ width, height: shape === 'circle' ? width : height }}
    />
  )
}
