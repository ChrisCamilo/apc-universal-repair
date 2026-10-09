import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { WorkInProgress } from './WorkInProgress.tsx'

const root = document.documentElement

/**
 * Converts a hex color to the `rgb(r, g, b)` form the browser reports for computed styles.
 * @param hex Color as `#RRGGBB`.
 * @returns The same color as `rgb(r, g, b)`.
 */
function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders a screen still being built in one style and mode and checks the notice names it, the mechanic is in
    // the accent, and the screen behind is blurred, out of reach and hidden from screen readers.
    test(`Web: the work-in-progress notice follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(
        <WorkInProgress label="Catálogo">
          <button type="button">Escolher marca</button>
        </WorkInProgress>,
      )
      await expect.element(screen.getByRole('heading', { name: 'A aba Catálogo ainda não está pronta' })).toBeVisible()
      await expect.element(screen.getByText('Estamos trabalhando nela. Volte em breve.')).toBeVisible()
      const illustration = screen.getByTestId('common.work-in-progress.notice.illustration').element()
      expect(getComputedStyle(illustration).color).toBe(rgb(colors.accent))
      const content = screen.getByTestId('common.work-in-progress.content').element() as HTMLElement
      expect(getComputedStyle(content).filter).toMatch(/^blur\(/)
      expect(content.inert).toBe(true)
      const button = screen.getByText('Escolher marca').element() as HTMLButtonElement
      button.focus()
      expect(document.activeElement).not.toBe(button)
    })
  }
}
