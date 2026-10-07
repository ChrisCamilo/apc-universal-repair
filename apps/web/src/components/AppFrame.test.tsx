import { useState } from 'react'
import { themes } from '@apc/shared/theme'
import { beforeAll, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { AppFrame } from './AppFrame.tsx'
import { Tabs } from './Tabs.tsx'

const TABS = ['Catálogo', 'Estoque', 'Ficha técnica', 'Manutenção', 'Diagnóstico', 'Preços'].map((label) => ({ id: label, label }))
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
  root.dataset.style = 'bmw90'
  root.dataset.mode = 'night'
  await page.viewport(1280, 720)
})

// Renders the frame with tabs, a slot at the end and content, and checks the APC mark heads the page, the
// navigation is named, the end slot and the content show, and the selected tab's underline sits on the header's
// hairline, on the canvas.
test('Web: the frame heads the page with the mark, the navigation and the end slot', async () => {
  const screen = await render(<Sample />)
  await expect.element(screen.getByRole('heading', { level: 1 }).getByRole('img', { name: 'APC Universal Repair' })).toBeVisible()
  await expect.element(screen.getByRole('navigation', { name: 'Seções' })).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Menu' })).toBeVisible()
  await expect.element(screen.getByRole('main')).toHaveTextContent('Conteúdo')
  expect(getComputedStyle(screen.getByRole('banner').element()).backgroundColor).toBe(rgb(themes.bmw90.night.colors.canvas))
  const line = screen.getByRole('banner').element().firstElementChild!.getBoundingClientRect()
  const tab = screen.getByRole('tab', { name: 'Catálogo' }).element().getBoundingClientRect()
  // the underline hangs 1px below the tab, over the hairline, and the navigation's scroll box reaches down
  // over it too, so the underline isn't cut off
  expect(tab.bottom + 1).toBeCloseTo(line.bottom, 0)
  expect(screen.getByRole('navigation').element().getBoundingClientRect().bottom).toBeCloseTo(line.bottom, 0)
})

// Checks the header is pinned to the top on desktop and scrolls with the page on a 360px phone, where six tabs
// scroll sideways inside the navigation without widening the page.
test('Web: the header is pinned on desktop and its tabs scroll sideways on a phone', async () => {
  const screen = await render(<Sample />)
  expect(getComputedStyle(screen.getByRole('banner').element()).position).toBe('sticky')
  await page.viewport(360, 780)
  try {
    expect(getComputedStyle(screen.getByRole('banner').element()).position).toBe('static')
    const nav = screen.getByRole('navigation').element()
    expect(nav.scrollWidth).toBeGreaterThan(nav.clientWidth)
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360)
  } finally {
    await page.viewport(1280, 720)
  }
})

function Sample() {
  const [tab, setTab] = useState(TABS[0].id)
  return (
    <AppFrame
      navLabel="Seções"
      nav={<Tabs label="Seções" tabs={TABS} selected={tab} onSelect={setTab} />}
      end={
        <button type="button" aria-label="Menu">
          CC
        </button>
      }
    >
      Conteúdo
    </AppFrame>
  )
}
