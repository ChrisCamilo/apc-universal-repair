import type { ReactNode } from 'react'
import { scales, themes, type ColorToken } from '@apc/shared/theme'

// Sheets that document the design tokens in Storybook. Every value shown is read from the CSS
// variables at render time, so each sheet reflects the style and mode picked in the toolbar.

const COLOR_TOKENS = Object.keys(themes.eighties.night.colors) as ColorToken[]
const RADII = [
  { name: 'panel', className: 'rounded-panel', variable: 'panel-radius' },
  { name: 'tile', className: 'rounded-tile', variable: 'tile-radius' },
  { name: 'pill', className: 'rounded-pill', variable: 'pill-radius' },
]

/**
 * Reads a theme CSS variable as resolved on `<html>` right now.
 * @param name Variable name without `--`, e.g. "canvas".
 * @returns The variable's value, e.g. "#0B0C0E".
 */
function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()
}

/**
 * Converts a camelCase token name to the kebab-case used by CSS variables.
 * @param name Token name, e.g. "panelRaised".
 * @returns Kebab-case name, e.g. "panel-raised".
 */
function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
}

export function PaletteSheet() {
  return (
    <Sheet title="Palette">
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {COLOR_TOKENS.map((token) => (
          <li key={token} data-testid={`color-${token}`} className="grid gap-2">
            <span
              className="block h-12 rounded-tile border border-hairline"
              style={{ backgroundColor: `var(--${kebab(token)})` }}
            />
            <b className="text-sm font-semibold">{token}</b>
            <code className="font-mono text-xs text-text-muted">--{kebab(token)}</code>
            <code data-testid="value" className="font-mono text-xs">{cssVar(kebab(token))}</code>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

export function TypeSheet() {
  return (
    <Sheet title="Type scale">
      <p className="text-sm text-text-muted">
        Display: {cssVar('display-face')} · tracking {cssVar('display-tracking')}
      </p>
      <ul className="grid gap-3">
        {Object.entries(scales.fontSize).map(([step, size]) => (
          <li key={step} data-testid={`type-${step}`} className="grid grid-cols-[72px_1fr] items-baseline gap-4">
            <code className="font-mono text-xs text-text-muted">{step} · {size}px</code>
            <span className="grid gap-1">
              <span className="font-display uppercase tracking-display" style={{ fontSize: `var(--font-size-${step})` }}>
                Opala Diplomata
              </span>
              <span style={{ fontSize: `var(--font-size-${step})` }}>Corpo em Barlow, 4.1 L 6 cilindros</span>
              <span className="font-mono" style={{ fontSize: `var(--font-size-${step})` }}>4.1 L · 6 CIL · 1986</span>
            </span>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

export function SpacingSheet() {
  return (
    <Sheet title="Spacing scale">
      <ul className="grid gap-2">
        {Object.entries(scales.space).map(([step, size]) => (
          <li key={step} data-testid={`space-${step}`} className="grid grid-cols-[96px_1fr] items-center gap-4">
            <code className="font-mono text-xs text-text-muted">{step} · {size}px</code>
            <span className="block h-3 rounded-pill bg-accent" style={{ width: size }} />
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

export function RadiiSheet() {
  return (
    <Sheet title="Radii">
      <ul className="flex flex-wrap gap-6">
        {RADII.map((radius) => (
          <li key={radius.name} data-testid={`radius-${radius.name}`} className="grid justify-items-center gap-2">
            <span className={`block h-20 w-28 border border-hairline bg-panel-raised ${radius.className}`} />
            <b className="text-sm font-semibold">{radius.name}</b>
            <code data-testid="value" className="font-mono text-xs text-text-muted">{cssVar(radius.variable)}</code>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

export function MotionSheet() {
  return (
    <Sheet title="Motion">
      <p className="text-sm text-text-muted">
        <span data-testid="motion-duration">{cssVar('motion-duration')}</span> · {cssVar('motion-easing')}
      </p>
      <div className="group w-full max-w-md rounded-panel border border-hairline bg-panel p-4">
        <p className="mb-3 text-sm">Hover to play the default transition.</p>
        <span className="block h-6 w-6 rounded-pill bg-accent shadow-glow transition-transform group-hover:translate-x-64" />
      </div>
    </Sheet>
  )
}

function Sheet({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 p-6">
      <h2 className="font-display text-2xl font-semibold uppercase tracking-display">{title}</h2>
      {children}
    </section>
  )
}
