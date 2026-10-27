import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens'
import { beforeAll, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { DemoNotice, REPOSITORY_URL } from './DemoNotice.tsx'

const root = document.documentElement

/**
 * Reads the room the notice keeps above the app's screens.
 * @returns The value of --top-inset, e.g. "29px"; empty when none is kept.
 */
function topInset(): string {
  return root.style.getPropertyValue('--top-inset')
}

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

// Renders the notice and checks it says the data is sample data that starts over on reload, and links to the
// repository in a new tab.
test('Web: the demo notice says what the demo is and links to the repository', async () => {
  const screen = await render(<DemoNotice />)
  const text = 'Modo demonstração: os dados são de exemplo, ficam só neste navegador e voltam ao início ao recarregar.'
  await expect.element(screen.getByRole('note').getByText(text)).toBeVisible()
  const link = screen.getByRole('link', { name: 'Ver no GitHub' })
  await expect.element(link).toHaveAttribute('href', REPOSITORY_URL)
  await expect.element(link).toHaveAttribute('target', '_blank')
})

// Renders the notice on a desktop, then on a phone, where it wraps, and checks --top-inset follows its height each
// time, so the screens under it leave it room; once the notice is gone, the room is given back.
test('Web: the demo notice keeps its height in --top-inset as it wraps', async () => {
  const screen = await render(<DemoNotice />)
  const bar = screen.getByRole('note').element()
  await expect.poll(topInset).toBe(`${bar.getBoundingClientRect().height}px`)
  const desktop = bar.getBoundingClientRect().height

  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  await expect.poll(() => bar.getBoundingClientRect().height).toBeGreaterThan(desktop)
  await expect.poll(topInset).toBe(`${bar.getBoundingClientRect().height}px`)

  screen.unmount()
  expect(topInset()).toBe('')
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})
