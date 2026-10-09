import type { CSSProperties } from 'react'
import { recipe, tv } from '../styles/tv.ts'

// The look of the text primitives, on the type scale of @apc/shared/typography: the display face, colors and tracking
// come from the theme variables, so every primitive follows the active style and mode. Size, tone and weight are
// variants every primitive shares.

// The type scale's sizes, the tones and the weights, as classes.
const SIZE = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
} as const
const TONE = { default: 'text-text', muted: 'text-text-muted', accent: 'text-accent', danger: 'text-danger' } as const
const WEIGHT = { 400: 'font-normal', 500: 'font-medium', 600: 'font-semibold', 700: 'font-bold' } as const

/**
 * A heading in the display face, in uppercase with half the style's tracking (HEADING_TRACKING), by size, weight and
 * tone.
 */
export const heading = recipe(
  'common.heading',
  tv({
    slots: { base: 'm-0 font-display uppercase leading-tight tracking-[calc(var(--display-tracking)*0.5)]' },
    variants: { size: SIZE, weight: WEIGHT, tone: TONE },
  }),
  { base: '' },
)

/** A field's or a group's label in the display face, in uppercase with the style's tracking, by tone. */
export const label = recipe(
  'common.label',
  tv({ slots: { base: 'font-display uppercase tracking-display' }, variants: { size: SIZE, weight: WEIGHT, tone: TONE } }),
  { base: '' },
)

/** Mono digits that line up, such as counts and codes, by tone. */
export const numericReadout = recipe(
  'common.numeric-readout',
  tv({ slots: { base: 'font-mono tabular-nums' }, variants: { size: SIZE, weight: WEIGHT, tone: TONE } }),
  { base: '' },
)

/** Body text, by size and tone. */
export const text = recipe(
  'common.text',
  tv({ slots: { base: 'm-0 font-body leading-relaxed' }, variants: { size: SIZE, tone: TONE } }),
  { base: '' },
)

/**
 * Builds the style that cuts text after a number of lines, under the caller's own style.
 * @param lines Lines to keep; undefined keeps every line.
 * @param style The caller's style, which wins.
 * @returns The text's style.
 */
export function textClamp(lines: number | undefined, style?: CSSProperties): CSSProperties {
  const clamp: CSSProperties = lines ? { display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}
  return { ...clamp, ...style }
}
