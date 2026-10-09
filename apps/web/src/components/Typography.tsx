import type { CSSProperties, HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react'
import {
  HEADING_LEVELS,
  LABEL_TYPE,
  READOUT_TYPE,
  type HeadingLevel,
  type TextSize,
  type Tone,
} from '@apc/shared/typography'
import { heading, label, numericReadout, text } from './Typography.styles.ts'

// Text primitives on top of the type scale (see @apc/shared/typography and Typography.styles.ts).

const HEADING_TAGS = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4' } as const
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
  const { classes, ids } = heading({ ...HEADING_LEVELS[level], tone })
  return (
    <Tag className={classes.base({ class: className })} data-testid={ids.base} {...rest}>
      {children}
    </Tag>
  )
}

export function Text({ size = 'base', tone = 'default', lines, inline, className, style, children, ...rest }: TextProps) {
  const Tag = inline ? 'span' : 'p'
  const { classes, ids } = text({ size, tone })
  return (
    <Tag
      className={classes.base({ class: className })}
      data-testid={ids.base}
      style={{ ...clampStyle(lines), ...style }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function Label({ htmlFor, tone = 'muted', className, children, ...rest }: LabelProps) {
  const { classes, ids } = label({ ...LABEL_TYPE, tone })
  return htmlFor ? (
    <label htmlFor={htmlFor} className={classes.base({ class: className })} data-testid={ids.base} {...rest}>
      {children}
    </label>
  ) : (
    <span className={classes.base({ class: className })} data-testid={ids.base} {...rest}>
      {children}
    </span>
  )
}

export function NumericReadout({ tone = 'default', className, children, ...rest }: ReadoutProps) {
  const { classes, ids } = numericReadout({ ...READOUT_TYPE, tone })
  return (
    <span className={classes.base({ class: className })} data-testid={ids.base} {...rest}>
      {children}
    </span>
  )
}
