import type { CSSProperties, HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react'
import {
  HEADING_LEVELS,
  LABEL_TYPE,
  READOUT_TYPE,
  type HeadingLevel,
  type TextSize,
  type Tone,
} from '@apc/shared/typography'

// Text primitives on top of the type scale (see @apc/shared/typography). The display face, colors and
// tracking come from the theme variables, so every primitive follows the active style and mode.
// Tailwind only builds classes it finds written out, hence the literal class maps below.

const HEADING_TAGS = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4' } as const
const SIZE_CLASSES = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
} as const
const TONE_CLASSES: Record<Tone, string> = {
  default: 'text-text',
  muted: 'text-text-muted',
  accent: 'text-accent',
  danger: 'text-danger',
}
const WEIGHT_CLASSES = { 400: 'font-normal', 500: 'font-medium', 600: 'font-semibold', 700: 'font-bold' } as const

type HeadingProps = HTMLAttributes<HTMLHeadingElement> & { level?: HeadingLevel; tone?: Tone; children: ReactNode }
type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  /** Renders a <label> tied to a field when set, otherwise a <span>. */
  htmlFor?: string
  tone?: Tone
  children: ReactNode
}
type ReadoutProps = HTMLAttributes<HTMLSpanElement> & { tone?: Tone; children: ReactNode }
type TextProps = HTMLAttributes<HTMLParagraphElement> & {
  size?: TextSize
  tone?: Tone
  /** Cuts the text after this many lines with an ellipsis. */
  lines?: number
  /** Renders a <span> for inline text instead of a <p>. */
  inline?: boolean
  children: ReactNode
}

/**
 * Joins class names, skipping empty ones.
 * @param names Class names, possibly undefined.
 * @returns The names separated by spaces.
 */
function cx(...names: (string | undefined)[]): string {
  return names.filter(Boolean).join(' ')
}

/**
 * Builds the inline style that cuts text after a number of lines.
 * @param lines Lines to keep; undefined keeps every line.
 * @returns Line-clamp style, or undefined when nothing is cut.
 */
function clampStyle(lines: number | undefined): CSSProperties | undefined {
  if (!lines) {
    return undefined
  }
  return { display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
}

export function Heading({ level = 2, tone = 'default', className, children, ...rest }: HeadingProps) {
  const Tag = HEADING_TAGS[level]
  const { size, weight } = HEADING_LEVELS[level]
  return (
    <Tag
      className={cx(
        'm-0 font-display uppercase leading-tight tracking-[calc(var(--display-tracking)*0.5)]',
        SIZE_CLASSES[size],
        WEIGHT_CLASSES[weight],
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function Text({ size = 'base', tone = 'default', lines, inline, className, style, children, ...rest }: TextProps) {
  const Tag = inline ? 'span' : 'p'
  return (
    <Tag
      className={cx('m-0 font-body leading-relaxed', SIZE_CLASSES[size], TONE_CLASSES[tone], className)}
      style={{ ...clampStyle(lines), ...style }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function Label({ htmlFor, tone = 'muted', className, children, ...rest }: LabelProps) {
  const classes = cx(
    'font-display uppercase tracking-display',
    SIZE_CLASSES[LABEL_TYPE.size],
    WEIGHT_CLASSES[LABEL_TYPE.weight],
    TONE_CLASSES[tone],
    className,
  )
  return htmlFor ? (
    <label htmlFor={htmlFor} className={classes} {...rest}>
      {children}
    </label>
  ) : (
    <span className={classes} {...rest}>
      {children}
    </span>
  )
}

export function NumericReadout({ tone = 'default', className, children, ...rest }: ReadoutProps) {
  return (
    <span
      className={cx(
        'font-mono tabular-nums',
        SIZE_CLASSES[READOUT_TYPE.size],
        WEIGHT_CLASSES[READOUT_TYPE.weight],
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}
