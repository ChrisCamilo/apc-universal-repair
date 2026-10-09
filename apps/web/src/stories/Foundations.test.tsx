import { MODES, STYLES, scales, themes } from '@apc/shared/theme'
import { beforeAll, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { render, type RenderResult } from 'vitest-browser-react'
import { themeCss } from '../theme.ts'
import { MotionSheet, PaletteSheet, RadiiSheet, SpacingSheet, TypeSheet } from './Foundations.tsx'

const root = document.documentElement

/**
 * Finds the card or row of a sheet that names a token.
 * @param screen The rendered sheets.
 * @param id The style id of the sheet's cards or rows, e.g. "docs.palette-sheet.colors.color".
 * @param name The token's name as the card shows it, e.g. "canvas".
 * @returns The card or row.
 */
function entry(screen: RenderResult, id: string, name: string) {
  // The inner locator comes from the page: one scoped to the render doesn't match inside the filter.
  return screen.getByTestId(id).filter({ has: page.getByText(name, { exact: true }) })
}

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders every Foundations sheet in one style and mode, as the Storybook toolbar does, and checks
    // they show that combination's token values and every step of the shared scales.
    test(`Web: foundations sheets show the ${style}/${mode} token values`, async () => {
      const theme = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(
        <>
          <PaletteSheet />
          <TypeSheet />
          <SpacingSheet />
          <RadiiSheet />
          <MotionSheet />
        </>,
      )

      for (const [token, value] of Object.entries(theme.colors)) {
        const color = entry(screen, 'docs.palette-sheet.colors.color', token)
        await expect.element(color.getByTestId('docs.palette-sheet.colors.color.value')).toHaveTextContent(value)
      }
      for (const tint of ['accent-soft', 'hairline-soft', 'warn-soft', 'danger-soft', 'backdrop']) {
        await expect.element(entry(screen, 'docs.palette-sheet.tints.tint', tint)).toBeVisible()
      }
      for (const [name, value] of [['panel', theme.radiusPanel], ['tile', theme.radiusTile]] as const) {
        const radius = entry(screen, 'docs.radii-sheet.radii.radius', name)
        await expect.element(radius.getByTestId('docs.radii-sheet.radii.radius.value')).toHaveTextContent(`${value}px`)
      }
      for (const [step, size] of Object.entries(scales.fontSize)) {
        await expect.element(entry(screen, 'docs.type-sheet.steps.step', `${step} · ${size}px`)).toBeVisible()
      }
      for (const [step, size] of Object.entries(scales.space)) {
        await expect.element(entry(screen, 'docs.spacing-sheet.steps.step', `${step} · ${size}px`)).toBeVisible()
      }
      await expect.element(screen.getByTestId('docs.motion-sheet.note.duration')).toHaveTextContent(`${scales.motion.durationMs}ms`)
    })
  }
}
