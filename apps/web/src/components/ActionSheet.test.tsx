import { useState } from 'react'
import { exportIcon, importIcon, listIcon, playIcon } from '@apc/shared/icons'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens'
import { themes } from '@apc/shared/theme'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { ActionSheet } from './ActionSheet.tsx'
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

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
})

afterAll(async () => {
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

// Opens the sheet at 360×780 and checks it grows with its four rows only, each 56px tall with its muted icon at the
// left of its name, the focus on the first, and 28px under the last above the screen's bottom.
test('Web: an action sheet lists its actions as rows, as tall as they need', async () => {
  const screen = await render(<Opener onImport={() => {}} />)
  await screen.getByRole('button', { name: 'Mais ações' }).click()
  const sheet = screen.getByRole('dialog', { name: 'Mais ações' })
  const rows = sheet.getByRole('button')
  expect(rows.elements().map((row) => row.textContent)).toEqual(['Gerenciar listas', 'Importar CSV', 'Exportar CSV', 'Tutorial do estoque'])
  await expect.element(rows.first()).toHaveFocus()
  for (const row of rows.elements()) {
    const box = row.getBoundingClientRect()
    const icon = row.querySelector('svg')!.getBoundingClientRect()
    expect(box.height).toBe(56)
    expect([icon.width, icon.left - box.left]).toEqual([22, 20])
    expect(getComputedStyle(row.querySelector('svg')!).color).toBe(rgb(themes.eighties.night.colors.textMuted))
  }
  const last = rows.last().element().getBoundingClientRect()
  expect(window.innerHeight - last.bottom).toBe(28)
  expect(sheet.element().getBoundingClientRect().top).toBeGreaterThan(window.innerHeight / 2)
})

// Presses an action, which closes the sheet and runs it, and closes it again with Escape without running anything.
test('Web: an action sheet closes and runs the action pressed', async () => {
  const onImport = vi.fn()
  const screen = await render(<Opener onImport={onImport} />)
  await screen.getByRole('button', { name: 'Mais ações' }).click()
  await screen.getByRole('button', { name: 'Importar CSV' }).click()
  expect(onImport).toHaveBeenCalledOnce()
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()

  await screen.getByRole('button', { name: 'Mais ações' }).click()
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
  expect(onImport).toHaveBeenCalledOnce()
})

function Opener({ onImport }: { onImport: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Mais ações</Button>
      <ActionSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Mais ações"
        actions={[
          { icon: listIcon, label: 'Gerenciar listas', onSelect: () => {} },
          { icon: importIcon, label: 'Importar CSV', onSelect: onImport },
          { icon: exportIcon, label: 'Exportar CSV', onSelect: () => {} },
          { icon: playIcon, label: 'Tutorial do estoque', onSelect: () => {} },
        ]}
      />
    </>
  )
}
