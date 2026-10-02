import { MODES, STYLES, scales, themes } from '@apc/shared/theme'
import { beforeAll, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { themeCss } from '../theme.ts'
import { MotionSheet, PaletteSheet, RadiiSheet, SpacingSheet, TypeSheet } from './Foundations.tsx'

const root = document.documentElement

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
        await expect.element(screen.getByTestId(`color-${token}`).getByTestId('value')).toHaveTextContent(value)
      }
      await expect.element(screen.getByTestId('radius-panel').getByTestId('value')).toHaveTextContent(`${theme.radiusPanel}px`)
      await expect.element(screen.getByTestId('radius-tile').getByTestId('value')).toHaveTextContent(`${theme.radiusTile}px`)
      for (const step of Object.keys(scales.fontSize)) {
        await expect.element(screen.getByTestId(`type-${step}`)).toBeVisible()
      }
      for (const step of Object.keys(scales.space)) {
        await expect.element(screen.getByTestId(`space-${step}`)).toBeVisible()
      }
      await expect.element(screen.getByTestId('motion-duration')).toHaveTextContent(`${scales.motion.durationMs}ms`)
    })
  }
}
