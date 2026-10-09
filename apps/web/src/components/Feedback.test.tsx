import { MODES, STYLES, themes } from '@apc/shared/theme'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { EmptyState, ErrorState } from './EmptyState.tsx'
import { Skeleton } from './Skeleton.tsx'
import { Spinner } from './Spinner.tsx'

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

afterEach(async () => {
  await commands.reduceMotion(false)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders an empty state, an error state and a spinner in the accent in one style and mode, and checks the
    // empty icon is muted, the error icon is danger, the titles are the text color and the spinner takes the
    // color around it.
    test(`Web: feedback follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(
        <>
          <EmptyState title="Nenhum item cadastrado" message="Cadastre a primeira peça." />
          <ErrorState title="Não foi possível carregar o estoque" message="Verifique a conexão e tente de novo." />
          <span className="text-accent">
            <Spinner label="Carregando" />
          </span>
        </>,
      )
      const iconOf = (title: string) => screen.getByText(title).element().parentElement!.querySelector('svg')!
      expect(getComputedStyle(iconOf('Nenhum item cadastrado')).color).toBe(rgb(colors.textMuted))
      expect(getComputedStyle(iconOf('Não foi possível carregar o estoque')).color).toBe(rgb(colors.danger))
      expect(getComputedStyle(screen.getByText('Nenhum item cadastrado').element()).color).toBe(rgb(colors.text))
      expect(getComputedStyle(screen.getByRole('status', { name: 'Carregando' }).element()).borderTopColor).toBe(rgb(colors.accent))
    })
  }
}

// Renders a spinner with a label and one without, and checks the first is announced as a status and the
// second is hidden from screen readers; both turn, and with reduced motion they fade instead.
test('Web: spinners are announced only with a label and fade with reduced motion', async () => {
  const screen = await render(
    <>
      <Spinner label="Carregando estoque" />
      <Spinner size="sm" />
    </>,
  )
  const loud = screen.getByRole('status', { name: 'Carregando estoque' }).element()
  const quiet = screen.getByTestId('common.spinner').elements()[1]
  expect(quiet.getAttribute('aria-hidden')).toBe('true')
  expect(getComputedStyle(loud).animationName).toBe('spin')

  await commands.reduceMotion(true)
  await expect.poll(() => getComputedStyle(loud).animationName).toBe('pulse')
  expect(getComputedStyle(quiet).animationName).toBe('pulse')
})

// Renders a line, a block and a circle and checks each is hidden from screen readers in its shape: lines are
// full-width pills, a circle is as tall as it is wide, and they pulse unless motion is reduced.
test('Web: skeletons take their shape and stand still with reduced motion', async () => {
  const screen = await render(
    <div style={{ width: 300 }}>
      <Skeleton />
      <Skeleton shape="block" width={120} height={80} />
      <Skeleton shape="circle" width={24} />
    </div>,
  )
  const [line, block, circle] = [...screen.container.querySelectorAll<HTMLElement>('[data-skeleton]')]
  for (const skeleton of [line, block, circle]) {
    expect(skeleton.getAttribute('aria-hidden')).toBe('true')
  }
  expect(line.getBoundingClientRect().width).toBe(300)
  expect(block.getBoundingClientRect()).toMatchObject({ width: 120, height: 80 })
  expect(circle.getBoundingClientRect()).toMatchObject({ width: 24, height: 24 })
  expect(getComputedStyle(line).animationName).toBe('pulse')

  await commands.reduceMotion(true)
  await expect.poll(() => getComputedStyle(line).animationName).toBe('none')
})

// Renders an empty state with an action and an error state with one, and checks only the error is an alert,
// both read as title and message, and their actions run.
test('Web: empty and error states say what happened and offer an action', async () => {
  const onAdd = vi.fn()
  const onRetry = vi.fn()
  const screen = await render(
    <>
      <EmptyState title="Nenhum item cadastrado" message="Cadastre a primeira peça." action={{ label: 'Adicionar item', onClick: onAdd }} />
      <ErrorState
        title="Não foi possível carregar o estoque"
        message="O servidor não respondeu. Verifique a conexão e tente de novo."
        action={{ label: 'Tentar de novo', onClick: onRetry }}
      />
    </>,
  )
  const alert = screen.getByRole('alert')
  await expect.element(alert).toMatchTextContent(/Não foi possível carregar o estoque.*Verifique a conexão e tente de novo/)
  expect(screen.getByRole('alert').elements()).toHaveLength(1)
  await expect.element(screen.getByRole('heading', { name: 'Nenhum item cadastrado' })).toBeVisible()
  await screen.getByRole('button', { name: 'Adicionar item' }).click()
  await alert.getByRole('button', { name: 'Tentar de novo' }).click()
  expect(onAdd).toHaveBeenCalledTimes(1)
  expect(onRetry).toHaveBeenCalledTimes(1)
})
