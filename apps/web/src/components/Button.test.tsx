import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../fonts.ts'
import '../index.css'
import { themeCss } from '../theme.ts'
import { Button } from './Button.tsx'

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
    // Renders a primary and a secondary button in one style and mode and checks the accent fill, the
    // glow only where the style has one, the outline, and the display face in uppercase.
    test(`Web: buttons follow the ${style}/${mode} theme`, async () => {
      const theme = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(
        <>
          <Button>Entrar</Button>
          <Button variant="secondary">Ver em 3D</Button>
        </>,
      )
      const primary = getComputedStyle(screen.getByRole('button', { name: 'Entrar' }).element())
      const secondary = getComputedStyle(screen.getByRole('button', { name: 'Ver em 3D' }).element())

      expect(primary.backgroundColor).toBe(rgb(theme.colors.accent))
      expect(primary.color).toBe(rgb(theme.colors.onAccent))
      expect(primary.boxShadow === 'none').toBe(theme.glow === null)
      expect(primary.fontFamily).toMatch(new RegExp(`^"?${theme.displayFont}`))
      expect(primary.textTransform).toBe('uppercase')
      expect(secondary.borderColor).toBe(rgb(theme.colors.hairline))
      expect(secondary.color).toBe(rgb(theme.colors.text))
    })
  }
}

// Hovers a secondary button and checks its outline and label turn to the accent, as the
// visual direction shows.
test('Web: secondary buttons turn accent on hover', async () => {
  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
  const screen = await render(<Button variant="secondary">Ver em 3D</Button>)
  const button = screen.getByRole('button', { name: 'Ver em 3D' })
  await userEvent.hover(button)
  await expect.element(button).toHaveStyle({ borderColor: rgb(themes.eighties.night.colors.accent) })
})

// Reaches the button with Tab and checks it shows the focus ring and runs its action with Enter and
// with Space, so it works without a mouse.
test('Web: buttons are keyboard operable with a visible focus ring', async () => {
  const onClick = vi.fn()
  const screen = await render(<Button onClick={onClick}>Entrar</Button>)
  await userEvent.keyboard('{Tab}')
  const button = screen.getByRole('button', { name: 'Entrar' })
  await expect.element(button).toHaveFocus()
  // the ring fades in with the theme's motion, so wait for the end of the transition
  await expect.poll(() => getComputedStyle(button.element()).boxShadow).toContain('0px 0px 0px 3px')

  await userEvent.keyboard('{Enter}')
  await userEvent.keyboard(' ')
  expect(onClick).toHaveBeenCalledTimes(2)
})

// Clicks a disabled and a loading button and checks neither runs its action; the loading one is
// marked busy and shows its spinner while keeping its name.
test('Web: disabled and loading buttons do not run their action', async () => {
  const onClick = vi.fn()
  const screen = await render(
    <>
      <Button disabled onClick={onClick}>Desligado</Button>
      <Button loading onClick={onClick}>Entrando</Button>
    </>,
  )
  const loading = screen.getByRole('button', { name: 'Entrando' })
  await screen.getByRole('button', { name: 'Desligado' }).click({ force: true })
  await loading.click({ force: true })
  expect(onClick).not.toHaveBeenCalled()
  await expect.element(loading).toHaveAttribute('aria-busy', 'true')
  await expect.element(loading).toBeDisabled()
  await expect.element(screen.getByTestId('button-spinner')).toBeVisible()
})

// Checks the link variant reads as inline text: body face, normal case, underlined, muted color.
test('Web: link buttons read as inline text', async () => {
  root.dataset.style = 'gt4'
  root.dataset.mode = 'day'
  const screen = await render(<Button variant="link">Esqueceu a senha?</Button>)
  const style = getComputedStyle(screen.getByRole('button', { name: 'Esqueceu a senha?' }).element())
  expect(style.fontFamily).toMatch(/^"?Barlow"?,/)
  expect(style.textTransform).toBe('none')
  expect(style.textDecorationLine).toBe('underline')
  expect(style.color).toBe(rgb(themes.gt4.day.colors.textMuted))
})
