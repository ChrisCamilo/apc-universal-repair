import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/ui-spec/screens'
import { MODES, STYLES, themes } from '@apc/tokens/theme'
import { afterEach, beforeAll, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../../index.css'
import { themeCss } from '../../app/theme.ts'
import { Accordion } from './Accordion.tsx'

const SECTIONS = [
  { id: 'inventory', title: 'Estoque', detail: '3 tutoriais', content: <button type="button">Cadastrar um item</button> },
  { id: 'catalog', title: 'Catálogo', detail: '1 tutorial', content: <button type="button">Montar uma ficha</button> },
  { id: 'server', title: 'Servidor', content: <button type="button">Ligar o acesso pelo celular</button> },
]
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

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

afterEach(async () => {
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders the accordion with its first section open in one style and mode, and checks the headers take the text
    // color, the notes and the chevrons the muted one, and a hairline parts the sections.
    test(`Web: the accordion follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<Accordion sections={SECTIONS} defaultOpen={['inventory']} />)
      const header = screen.getByRole('button', { name: /Estoque/ }).element()
      expect(getComputedStyle(header).color).toBe(rgb(colors.text))
      expect(getComputedStyle(screen.getByText('3 tutoriais').element()).color).toBe(rgb(colors.textMuted))
      expect(getComputedStyle(header.querySelector('svg')!).color).toBe(rgb(colors.textMuted))
      const second = header.closest('[data-testid="common.accordion.section"]')!.nextElementSibling!
      expect([getComputedStyle(second).borderTopWidth, getComputedStyle(second).borderTopStyle]).toEqual(['1px', 'solid'])
    })
  }
}

// Checks each header is a button inside a heading that says whether its section is open and names the region it opens,
// and a closed section's content is hidden from the page and from screen readers.
test('Web: the accordion has heading, button and region semantics', async () => {
  const screen = await render(<Accordion sections={SECTIONS} defaultOpen={['inventory']} />)
  await expect.element(screen.getByRole('heading', { level: 3, name: /Estoque/ })).toBeVisible()
  const header = screen.getByRole('button', { name: /Estoque/ })
  await expect.element(header).toHaveAttribute('aria-expanded', 'true')
  await expect.element(screen.getByRole('region', { name: /Estoque/ })).toBeVisible()
  await expect.element(screen.getByRole('button', { name: /Catálogo/ })).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByRole('button', { name: 'Montar uma ficha' }).query()).toBeNull()
  const closed = document.getElementById(screen.getByRole('button', { name: /Catálogo/ }).element().getAttribute('aria-controls')!)!
  expect(getComputedStyle(closed).visibility).toBe('hidden')
  expect(header.element().getAttribute('aria-controls')).toBe(screen.getByRole('region', { name: /Estoque/ }).element().id)
})

// Clicks a closed header, then the open one, and checks each opens and closes its own section, the others as they were,
// two open at once.
test('Web: a click opens and closes its own section', async () => {
  const screen = await render(<Accordion sections={SECTIONS} defaultOpen={['inventory']} />)
  await screen.getByRole('button', { name: /Catálogo/ }).click()
  await expect.element(screen.getByRole('button', { name: 'Montar uma ficha' })).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Cadastrar um item' })).toBeVisible()
  await screen.getByRole('button', { name: /Estoque/ }).click()
  await expect.element(screen.getByRole('button', { name: /Estoque/ })).toHaveAttribute('aria-expanded', 'false')
  await expect.poll(() => screen.getByRole('button', { name: 'Cadastrar um item' }).query()).toBeNull()
})

// Tabs to the first header and moves with the arrows, End and Home, going round at the ends; Enter and Space open and
// close the header the focus is on, and Tab goes on into the open content.
test('Web: the keyboard moves between the headers and opens them', async () => {
  const screen = await render(<Accordion sections={SECTIONS} />)
  const header = (name: RegExp) => screen.getByRole('button', { name })
  await userEvent.keyboard('{Tab}')
  await expect.element(header(/Estoque/)).toHaveFocus()
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(header(/Catálogo/)).toHaveFocus()
  await userEvent.keyboard('{End}')
  await expect.element(header(/Servidor/)).toHaveFocus()
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(header(/Estoque/)).toHaveFocus()
  await userEvent.keyboard('{ArrowUp}')
  await expect.element(header(/Servidor/)).toHaveFocus()
  await userEvent.keyboard('{Home}{Enter}')
  await expect.element(header(/Estoque/)).toHaveAttribute('aria-expanded', 'true')
  await userEvent.keyboard('{Tab}')
  await expect.element(screen.getByRole('button', { name: 'Cadastrar um item' })).toHaveFocus()
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}{ }')
  await expect.element(header(/Estoque/)).toHaveAttribute('aria-expanded', 'false')
})

// Renders the accordion at 1280×720 and on a 360×780 phone, and checks the headers fit the width, and on the phone are
// at least 48px tall, a finger's reach, the page not scrolling sideways.
test('Web: the accordion fits both minimum sizes, with headers a finger tall on a phone', async () => {
  for (const [width, height] of [
    [MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT],
    [MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT],
  ]) {
    await page.viewport(width, height)
    const screen = await render(<Accordion sections={SECTIONS} defaultOpen={['inventory']} />)
    const box = screen.getByRole('button', { name: /Estoque/ }).element().getBoundingClientRect()
    expect(box.right).toBeLessThanOrEqual(width)
    if (width === MIN_MOBILE_WIDTH) {
      expect(box.height).toBeGreaterThanOrEqual(48)
    }
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width)
    screen.unmount()
  }
})
