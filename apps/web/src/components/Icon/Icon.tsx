import type { SVGProps } from 'react'
import { ICON_SIZES, ICON_STROKE, ICON_VIEWBOX, type IconShape } from '@apc/shared/icons'
import { icon as iconRecipe } from './Icon.styles.ts'

// Draws a shared icon as inline SVG. The stroke is currentColor, so an icon takes the color of the
// text around it (text-text-muted, text-accent…) and follows the active style and mode.

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children' | 'width' | 'height'> & {
  /** Icon geometry from @apc/shared/icons, e.g. searchIcon. */
  icon: IconShape[]
  /** Width and height in px, from ICON_SIZES; defaults to ICON_SIZES.body. */
  size?: number
  /** Accessible name. Leave it out when text next to the icon already says what it is. */
  label?: string
}

export function Icon({ icon, size = ICON_SIZES.body, label, className, ...svg }: IconProps) {
  const { classes, ids } = iconRecipe()
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }
  return (
    <svg
      viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={classes.base({ class: className }) || undefined}
      data-testid={ids.base}
      {...a11y}
      {...svg}
    >
      {icon.map((shape, i) => (
        <Shape key={i} shape={shape} />
      ))}
    </svg>
  )
}

function Shape({ shape }: { shape: IconShape }) {
  switch (shape.kind) {
    case 'path':
      return <path d={shape.d} />
    case 'circle':
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} />
    case 'rect':
      return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} />
  }
}
