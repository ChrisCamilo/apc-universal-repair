import type { ReactNode } from 'react'
import { scales, themes, type ColorToken } from '@apc/shared/theme'
import type { Styled } from '../styles/tv.ts'
import { motionSheet, paletteSheet, radiiSheet, spaceBar, spacingSheet, swatchFill, typeSheet, typeStep } from './Foundations.styles.ts'

// Sheets that document the design tokens in Storybook. Every value shown is read from the CSS
// variables at render time, so each sheet reflects the style and mode picked in the toolbar.

const COLOR_TOKENS = Object.keys(themes.eighties.night.colors) as ColorToken[]
const RADII = [
  { name: 'panel', variable: 'panel-radius' },
  { name: 'tile', variable: 'tile-radius' },
  { name: 'pill', variable: 'pill-radius' },
] as const
const TINTS = [
  { name: 'accent-soft', use: 'Chips and buttons that are on' },
  { name: 'hairline-soft', use: 'Panel borders and dividers' },
  { name: 'warn-soft', use: 'Low-stock rows' },
  { name: 'warn-soft-hover', use: 'Low-stock rows on hover' },
  { name: 'danger-soft', use: 'Out-of-stock rows' },
  { name: 'danger-soft-hover', use: 'Out-of-stock rows on hover' },
  { name: 'backdrop', use: 'Behind dialogs' },
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
  const ui = paletteSheet()
  const { classes, ids } = ui
  return (
    <Sheet title="Palette" ui={ui}>
      <ul className={classes.colors()} data-testid={ids.colors}>
        {COLOR_TOKENS.map((token) => (
          <li key={token} className={classes.color()} data-testid={ids.color}>
            <span className={classes.swatch()} data-testid={ids.swatch} style={swatchFill(kebab(token))} />
            <b className={classes.name()} data-testid={ids.name}>
              {token}
            </b>
            <code className={classes.variable()} data-testid={ids.variable}>
              --{kebab(token)}
            </code>
            <code className={classes.value()} data-testid={ids.value}>
              {cssVar(kebab(token))}
            </code>
          </li>
        ))}
      </ul>
      <h3 className={classes.tintsTitle()} data-testid={ids.tintsTitle}>
        Tints
      </h3>
      <p className={classes.tintsNote()} data-testid={ids.tintsNote}>
        Theme colors at a set opacity, shown over the canvas.
      </p>
      <ul className={classes.tints()} data-testid={ids.tints}>
        {TINTS.map((tint) => (
          <li key={tint.name} className={classes.tint()} data-testid={ids.tint}>
            <span className={classes.tintSwatch()} data-testid={ids.tintSwatch} style={swatchFill(tint.name)} />
            <b className={classes.tintName()} data-testid={ids.tintName}>
              {tint.name}
            </b>
            <code className={classes.tintVariable()} data-testid={ids.tintVariable}>
              --{tint.name}
            </code>
            <span className={classes.tintUse()} data-testid={ids.tintUse}>
              {tint.use}
            </span>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

export function TypeSheet() {
  const ui = typeSheet()
  const { classes, ids } = ui
  return (
    <Sheet title="Type scale" ui={ui}>
      <p className={classes.note()} data-testid={ids.note}>
        Display: {cssVar('display-face')} · tracking {cssVar('display-tracking')}
      </p>
      <ul className={classes.steps()} data-testid={ids.steps}>
        {Object.entries(scales.fontSize).map(([step, size]) => (
          <li key={step} className={classes.step()} data-testid={ids.step}>
            <code className={classes.label()} data-testid={ids.label}>
              {step} · {size}px
            </code>
            <span className={classes.samples()} data-testid={ids.samples}>
              <span className={classes.display()} data-testid={ids.display} style={typeStep(step)}>
                Opala Diplomata
              </span>
              <span className={classes.body()} data-testid={ids.body} style={typeStep(step)}>
                Corpo em Barlow, 4.1 L 6 cilindros
              </span>
              <span className={classes.mono()} data-testid={ids.mono} style={typeStep(step)}>
                4.1 L · 6 CIL · 1986
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

export function SpacingSheet() {
  const ui = spacingSheet()
  const { classes, ids } = ui
  return (
    <Sheet title="Spacing scale" ui={ui}>
      <ul className={classes.steps()} data-testid={ids.steps}>
        {Object.entries(scales.space).map(([step, size]) => (
          <li key={step} className={classes.step()} data-testid={ids.step}>
            <code className={classes.label()} data-testid={ids.label}>
              {step} · {size}px
            </code>
            <span className={classes.bar()} data-testid={ids.bar} style={spaceBar(size)} />
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

export function RadiiSheet() {
  const ui = radiiSheet()
  const { classes, ids } = ui
  return (
    <Sheet title="Radii" ui={ui}>
      <ul className={classes.radii()} data-testid={ids.radii}>
        {RADII.map((radius) => (
          <li key={radius.name} className={classes.radius()} data-testid={ids.radius}>
            <span className={classes.sample({ radius: radius.name })} data-testid={ids.sample} />
            <b className={classes.name()} data-testid={ids.name}>
              {radius.name}
            </b>
            <code className={classes.value()} data-testid={ids.value}>
              {cssVar(radius.variable)}
            </code>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

export function MotionSheet() {
  const ui = motionSheet()
  const { classes, ids } = ui
  return (
    <Sheet title="Motion" ui={ui}>
      <p className={classes.note()} data-testid={ids.note}>
        <span className={classes.duration()} data-testid={ids.duration}>
          {cssVar('motion-duration')}
        </span>{' '}
        · {cssVar('motion-easing')}
      </p>
      <div className={classes.demo()} data-testid={ids.demo}>
        <p className={classes.hint()} data-testid={ids.hint}>
          Hover to play the default transition.
        </p>
        <span className={classes.dot()} data-testid={ids.dot} />
      </div>
    </Sheet>
  )
}

/**
 * Lays out a sheet: its section and title, styled by the sheet's own recipe, so they carry its ids.
 * @param props.title The sheet's title.
 * @param props.ui The sheet's recipe, called.
 * @param props.children The sheet's content.
 */
function Sheet({ title, ui, children }: { title: string; ui: Styled<{ base: () => string; title: () => string }>; children: ReactNode }) {
  const { classes, ids } = ui
  return (
    <section className={classes.base()} data-testid={ids.base}>
      <h2 className={classes.title()} data-testid={ids.title}>
        {title}
      </h2>
      {children}
    </section>
  )
}
