import type { CSSProperties } from 'react'
import { recipe, tv } from '../styles/tv.ts'

// The look of the token sheets in Storybook: each sheet a padded section under a display title; colors and tints as
// swatch cards in an auto-filling grid; type steps and spacing steps as a label column beside the sample; and radii
// as raised samples in a wrapping row. The swatches, the type samples and the spacing bars take the token they show
// from style functions, as it changes for each one.

// A grid of swatch cards, each card, its swatch and its lines.
const CARD = 'grid gap-2'
const CARD_NAME = 'text-sm font-semibold'
const CARD_NOTE = 'font-mono text-xs text-text-muted'
const CARDS = 'grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3'
// The parts every sheet has: the section and its title.
const SHEET = {
  base: 'grid gap-4 p-6',
  title: 'font-display text-2xl font-semibold uppercase tracking-display',
}
const SWATCH = 'block h-12 rounded-tile border border-hairline'

/** The motion sheet: the duration and easing, and a dot that plays the default transition on hover. */
export const motionSheet = recipe(
  'docs.motion-sheet',
  tv({
    slots: {
      ...SHEET,
      note: 'text-sm text-text-muted',
      duration: '',
      demo: 'group w-full max-w-md rounded-panel border border-hairline bg-panel p-4',
      hint: 'mb-3 text-sm',
      dot: 'block h-6 w-6 rounded-pill bg-accent shadow-glow transition-transform group-hover:translate-x-64',
    },
  }),
  {
    base: '',
    title: 'title',
    note: 'note',
    duration: 'note.duration',
    demo: 'demo',
    hint: 'demo.hint',
    dot: 'demo.dot',
  },
)

/** The color sheet: the theme colors and the tints, as swatch cards with their name, variable and value or use. */
export const paletteSheet = recipe(
  'docs.palette-sheet',
  tv({
    slots: {
      ...SHEET,
      colors: CARDS,
      color: CARD,
      swatch: SWATCH,
      name: CARD_NAME,
      variable: CARD_NOTE,
      value: 'font-mono text-xs',
      tintsTitle: 'm-0 font-display text-lg font-semibold uppercase tracking-display',
      tintsNote: 'm-0 text-sm text-text-muted',
      tints: CARDS,
      tint: CARD,
      tintSwatch: SWATCH,
      tintName: CARD_NAME,
      tintVariable: CARD_NOTE,
      tintUse: 'text-xs text-text-muted',
    },
  }),
  {
    base: '',
    title: 'title',
    colors: 'colors',
    color: 'colors.color',
    swatch: 'colors.color.swatch',
    name: 'colors.color.name',
    variable: 'colors.color.variable',
    value: 'colors.color.value',
    tintsTitle: 'tints-title',
    tintsNote: 'tints-note',
    tints: 'tints',
    tint: 'tints.tint',
    tintSwatch: 'tints.tint.swatch',
    tintName: 'tints.tint.name',
    tintVariable: 'tints.tint.variable',
    tintUse: 'tints.tint.use',
  },
)

/** The radii sheet: a raised sample of each radius, with its name and value. */
export const radiiSheet = recipe(
  'docs.radii-sheet',
  tv({
    slots: {
      ...SHEET,
      radii: 'flex flex-wrap gap-6',
      radius: 'grid justify-items-center gap-2',
      sample: 'block h-20 w-28 border border-hairline bg-panel-raised',
      name: 'text-sm font-semibold',
      value: 'font-mono text-xs text-text-muted',
    },
    variants: {
      radius: { panel: { sample: 'rounded-panel' }, tile: { sample: 'rounded-tile' }, pill: { sample: 'rounded-pill' } },
    },
  }),
  {
    base: '',
    title: 'title',
    radii: 'radii',
    radius: 'radii.radius',
    sample: 'radii.radius.sample',
    name: 'radii.radius.name',
    value: 'radii.radius.value',
  },
)

/** The spacing sheet: each space step with a bar that wide. */
export const spacingSheet = recipe(
  'docs.spacing-sheet',
  tv({
    slots: {
      ...SHEET,
      steps: 'grid gap-2',
      step: 'grid grid-cols-[96px_1fr] items-center gap-4',
      label: 'font-mono text-xs text-text-muted',
      bar: 'block h-3 rounded-pill bg-accent',
    },
  }),
  { base: '', title: 'title', steps: 'steps', step: 'steps.step', label: 'steps.step.label', bar: 'steps.step.bar' },
)

/** The type sheet: the display face note, then each size step with the display, body and mono samples. */
export const typeSheet = recipe(
  'docs.type-sheet',
  tv({
    slots: {
      ...SHEET,
      note: 'text-sm text-text-muted',
      steps: 'grid gap-3',
      step: 'grid grid-cols-[72px_1fr] items-baseline gap-4',
      label: 'font-mono text-xs text-text-muted',
      samples: 'grid gap-1',
      display: 'font-display uppercase tracking-display',
      body: '',
      mono: 'font-mono',
    },
  }),
  {
    base: '',
    title: 'title',
    note: 'note',
    steps: 'steps',
    step: 'steps.step',
    label: 'steps.step.label',
    samples: 'steps.step.samples',
    display: 'steps.step.samples.display',
    body: 'steps.step.samples.body',
    mono: 'steps.step.samples.mono',
  },
)

/**
 * Sizes a spacing bar to its step.
 * @param size The step, in px.
 * @returns The bar's width.
 */
export function spaceBar(size: number): CSSProperties {
  return { width: size }
}

/**
 * Fills a swatch with a theme variable.
 * @param name Variable name without `--`, e.g. "canvas".
 * @returns The swatch's background.
 */
export function swatchFill(name: string): CSSProperties {
  return { backgroundColor: `var(--${name})` }
}

/**
 * Sets a type sample in a size step.
 * @param step Size step, e.g. "lg".
 * @returns The sample's font size, from the step's variable.
 */
export function typeStep(step: string): CSSProperties {
  return { fontSize: `var(--font-size-${step})` }
}
