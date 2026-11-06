import type { SVGProps } from 'react'
import { brandMark } from './BrandMark.styles.ts'

// APC brand mark: an instrument-panel badge whose needle and inner rule take the active accent,
// with everything else in the text colors, so it follows the style and mode on <html>.
// "badge" is the full logo (login); "compact" is the small gauge for headers and icons.

const BADGE_TICKS = [
  [62, 126, 70, 126],
  [74, 106, 80, 110],
  [110, 78, 110, 86],
  [146, 106, 140, 110],
  [150, 126, 158, 126],
]
const COMPACT_TICKS = [
  [10, 30, 14, 30],
  [24, 16, 24, 20],
  [34, 30, 38, 30],
]
const LABEL = 'APC Universal Repair'

type BrandMarkProps = Omit<SVGProps<SVGSVGElement>, 'children' | 'width' | 'height'> & {
  variant?: 'badge' | 'compact'
  /** Width in px; the badge keeps its 11:9 ratio and reads well from 120px, the compact mark is square and reads down to 16px. */
  size?: number
}

export function BrandMark({ variant = 'badge', size, className, ...svg }: BrandMarkProps) {
  const { classes, ids } = brandMark()
  const root = { className: classes.base({ class: className }) || undefined, 'data-testid': ids.base }
  if (variant === 'compact') {
    const side = size ?? 24
    return (
      <svg viewBox="0 0 48 48" width={side} height={side} fill="none" role="img" aria-label={LABEL} {...root} {...svg}>
        <rect x="2" y="2" width="44" height="44" rx="10" className={classes.frame()} data-testid={ids.frame} strokeOpacity=".35" strokeWidth="2" />
        <path d="M10 30 A14 14 0 0 1 38 30" className={classes.dial()} data-testid={ids.dial} strokeOpacity=".6" strokeWidth="3" />
        {COMPACT_TICKS.map(([x1, y1, x2, y2]) => (
          <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} className={classes.tick()} data-testid={ids.tick} strokeWidth="2.5" />
        ))}
        <line
          x1="24"
          y1="30"
          x2="32"
          y2="21"
          className={classes.needle()}
          data-testid={ids.needle}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <circle cx="24" cy="30" r="3" className={classes.hub()} data-testid={ids.hub} />
      </svg>
    )
  }

  const width = size ?? 240
  return (
    <svg
      viewBox="0 0 220 180"
      width={width}
      height={(width * 180) / 220}
      fill="none"
      role="img"
      aria-label={LABEL}
      {...root}
      {...svg}
    >
      <rect x="12" y="12" width="196" height="156" rx="16" className={classes.frame()} data-testid={ids.frame} strokeOpacity=".35" strokeWidth="1.5" />
      <rect x="22" y="22" width="176" height="136" rx="10" className={classes.rule()} data-testid={ids.rule} strokeOpacity=".55" strokeWidth="1" />
      <text x="110" y="70" textAnchor="middle" className={classes.title()} data-testid={ids.title}>
        APC
      </text>
      <path d="M62 126 A48 48 0 0 1 158 126" className={classes.dial()} data-testid={ids.dial} strokeOpacity=".45" strokeWidth="1.5" />
      {BADGE_TICKS.map(([x1, y1, x2, y2]) => (
        <line
          key={`${x1}-${y1}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          className={classes.tick()}
          data-testid={ids.tick}
          strokeOpacity=".6"
          strokeWidth="2"
        />
      ))}
      <line
        x1="110"
        y1="126"
        x2="140"
        y2="96"
        className={classes.needle()}
        data-testid={ids.needle}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="110" cy="126" r="4" className={classes.hub()} data-testid={ids.hub} />
      <text x="110" y="150" textAnchor="middle" className={classes.subtitle()} data-testid={ids.subtitle}>
        UNIVERSAL REPAIR
      </text>
    </svg>
  )
}
