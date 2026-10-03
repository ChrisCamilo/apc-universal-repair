import { useState } from 'react'
import { PAGE_SIZES } from '@apc/shared/pagination'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { Pagination } from './Pagination.tsx'

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
    // Renders a list in one style and mode and checks the current page fills with the accent in the on-accent
    // color, and the other pages are text on a soft hairline frame.
    test(`Web: pagination follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<Sample total={240} />)
      const current = screen.getByRole('button', { name: 'Página 1' }).element()
      expect(getComputedStyle(current).backgroundColor).toBe(rgb(colors.accent))
      expect(getComputedStyle(current).color).toBe(rgb(colors.onAccent))
      expect(getComputedStyle(screen.getByRole('button', { name: 'Página 2' }).element()).color).toBe(rgb(colors.text))
    })
  }
}

// Opens the middle of a long list and checks the nav keeps the first and last pages and the neighbors of the
// current one, marks the current page, and hides the ellipses from assistive technology.
test('Web: a long list shows the ends and the neighbors of the current page', async () => {
  const screen = await render(<Sample total={240} initialPage={5} />)
  const nav = screen.getByRole('navigation', { name: 'Páginas do estoque' })
  expect(nav.getByRole('button').elements().map((b) => b.getAttribute('aria-label'))).toEqual([
    'Página anterior',
    'Página 1',
    'Página 4',
    'Página 5',
    'Página 6',
    'Página 10',
    'Próxima página',
  ])
  await expect.element(screen.getByRole('button', { name: 'Página 5' })).toHaveAttribute('aria-current', 'page')
  expect(nav.element().querySelectorAll('[aria-hidden="true"]:not(svg)')).toHaveLength(2)
})

// Moves through a short list with next, a page button and previous, and checks the range follows in a live
// region; at each end the matching button is disabled, ignores presses and keeps the focus.
test('Web: previous, next and the page buttons move through the list', async () => {
  const screen = await render(<Sample total={64} />)
  const range = screen.getByText(/ de 64$/)
  await expect.element(range).toHaveAttribute('aria-live', 'polite')
  const previous = screen.getByRole('button', { name: 'Página anterior' })
  const next = screen.getByRole('button', { name: 'Próxima página' })
  await expect.element(previous).toHaveAttribute('aria-disabled', 'true')
  // Playwright won't press a disabled button on its own, so the press is forced.
  await previous.click({ force: true })
  await expect.element(range).toHaveTextContent('1–25 de 64')

  await next.click()
  await expect.element(range).toHaveTextContent('26–50 de 64')
  await screen.getByRole('button', { name: 'Página 3' }).click()
  await expect.element(range).toHaveTextContent('51–64 de 64')
  await expect.element(next).toHaveAttribute('aria-disabled', 'true')
  await next.click({ force: true })
  await expect.element(range).toHaveTextContent('51–64 de 64')
  await expect.element(next).toHaveFocus()

  await previous.click()
  await expect.element(range).toHaveTextContent('26–50 de 64')
  await expect.element(previous).not.toHaveAttribute('aria-disabled')
})

// Picks a bigger page size on the third page and checks the selector says so and the page moves to the one
// still holding the first item that was showing.
test('Web: changing the page size keeps the first item in view', async () => {
  const onPageSizeChange = vi.fn()
  const screen = await render(<Sample total={240} initialPage={3} onPageSizeChange={onPageSizeChange} />)
  await expect.element(screen.getByText('51–75 de 240')).toBeVisible()
  await screen.getByRole('radio', { name: '50' }).click()
  expect(onPageSizeChange).toHaveBeenCalledWith(50)
  await expect.element(screen.getByRole('radiogroup', { name: 'Itens por página' }).getByRole('radio', { name: '50' })).toBeChecked()
  await expect.element(screen.getByText('51–100 de 240')).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
})

// Renders an empty list and checks no pagination shows.
test('Web: an empty list shows no pagination', async () => {
  const screen = await render(<Sample total={0} />)
  expect(screen.container.childElementCount).toBe(0)
})

// Fits a long list in the width a 360px phone leaves inside its gutters and checks nothing overflows: the
// selector, the range and the page buttons wrap onto their own lines instead.
test('Web: pagination wraps at phone width', async () => {
  const screen = await render(
    <div style={{ width: 328 }}>
      <Sample total={2400} initialPage={50} />
    </div>,
  )
  const box = screen.container.firstElementChild as HTMLElement
  expect(box.scrollWidth).toBeLessThanOrEqual(328)
  const top = (element: Element) => element.getBoundingClientRect().top
  const selector = screen.getByRole('radiogroup', { name: 'Itens por página' }).element()
  const range = screen.getByText('1.226–1.250 de 2.400').element()
  expect(top(range)).toBeGreaterThan(top(selector))
  expect(top(screen.getByRole('navigation').element())).toBeGreaterThan(top(range))
})

function Sample({
  total,
  initialPage = 1,
  onPageSizeChange,
}: {
  total: number
  initialPage?: number
  onPageSizeChange?: (pageSize: number) => void
}) {
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0])
  return (
    <Pagination
      label="Páginas do estoque"
      page={page}
      pageSize={pageSize}
      total={total}
      pageSizes={PAGE_SIZES}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size)
        onPageSizeChange?.(size)
      }}
    />
  )
}
