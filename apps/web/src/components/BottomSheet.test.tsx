import { useState } from 'react'
import { SHEET_CLOSE_DRAG, SHEET_HANDLE, SHEET_RADIUS, SHEET_TOP_INSET } from '@apc/shared/dialog'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { expectOverlayAtOnce, expectOverlayMotion } from '../test-motion.ts'
import { themeCss } from '../theme.ts'
import { BottomSheet } from './BottomSheet.tsx'
import { Button } from './Button.tsx'

const OPTIONS = ['Gerenciar listas', 'Importar CSV', 'Exportar CSV', 'Tutorial do estoque']
const root = document.documentElement

/**
 * Lets the browser compute a theme color at an opacity, in the form it reports it.
 * @param hex Color as `#RRGGBB`.
 * @param percent Opacity in percent.
 * @returns The computed color.
 */
function mixed(hex: string, percent: number): string {
  const probe = document.createElement('span')
  probe.style.color = `color-mix(in srgb, ${hex} ${percent}%, transparent)`
  document.body.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color
}

/**
 * Converts a hex color to the `rgb(r, g, b)` form the browser reports for computed styles.
 * @param hex Color as `#RRGGBB`.
 * @returns The same color as `rgb(r, g, b)`.
 */
function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Drags the sheet's handle down by a distance with the pointer, and lets go.
 * @param distance How far down, in px.
 */
async function dragHandle(distance: number): Promise<void> {
  const handle = document.querySelector<HTMLElement>('[data-testid="common.bottom-sheet.handle"]')!
  const box = handle.getBoundingClientRect()
  const x = box.left + box.width / 2
  const y = box.top + box.height / 2
  const pointer = { pointerId: 1, bubbles: true, isPrimary: true, clientX: x }
  handle.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientY: y }))
  handle.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientY: y + distance }))
  await expect.poll(() => getComputedStyle(handle.closest('dialog')!).translate).toBe(`0px ${distance}px`)
  handle.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientY: y + distance }))
}

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
})

afterAll(async () => {
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens a sheet in one style and mode at 360×780 and checks it is docked to the bottom edge across the screen,
    // with the panel fill, rounded top corners, the handle's bar and the title in the display face, over the canvas
    // at 72%.
    test(`Web: bottom sheets follow the ${style}/${mode} theme`, async () => {
      const theme = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<Opener initiallyOpen />)
      const sheet = screen.getByRole('dialog', { name: 'Mais ações' })
      await expect.element(sheet).toBeVisible()
      const box = sheet.element().getBoundingClientRect()
      expect(box.left).toBe(0)
      expect(box.width).toBe(window.innerWidth)
      expect(box.bottom).toBeCloseTo(window.innerHeight, 0)
      const look = getComputedStyle(sheet.element())
      expect(look.backgroundColor).toBe(rgb(theme.colors.panel))
      expect(look.borderTopLeftRadius).toBe(`${SHEET_RADIUS}px`)
      expect(look.borderBottomLeftRadius).toBe('0px')
      expect(getComputedStyle(sheet.element(), '::backdrop').backgroundColor).toBe(mixed(theme.colors.canvas, 72))
      const bar = screen.getByTestId('common.bottom-sheet.handle.bar').element().getBoundingClientRect()
      expect([bar.width, bar.height]).toEqual([SHEET_HANDLE.width, SHEET_HANDLE.height])
      expect(getComputedStyle(screen.getByRole('heading', { name: 'Mais ações' }).element()).fontFamily).toMatch(
        new RegExp(`^"?${theme.displayFont}`),
      )
    })
  }
}

// Opens a sheet from a button and checks the focus starts inside, on its first control, and never reaches the page
// behind on Tab; Escape asks the owner to close it, and the focus goes back to the button that opened it.
test('Web: bottom sheets keep the focus inside and give it back on Escape', async () => {
  const onClose = vi.fn()
  const screen = await render(<Opener onClosed={onClose} />)
  const opener = screen.getByRole('button', { name: 'Mais ações' })
  await opener.click()
  await expect.element(screen.getByRole('button', { name: 'Limpar' })).toHaveFocus()
  for (let step = 0; step < OPTIONS.length + 2; step++) {
    await userEvent.keyboard('{Tab}')
    const active = document.activeElement
    expect(active === document.body || screen.getByRole('dialog').element().contains(active)).toBe(true)
  }
  await userEvent.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalledOnce()
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
  await expect.element(opener).toHaveFocus()
})

// Clicks a choice inside the sheet, which leaves it open, then the backdrop (the dialog element itself, around its
// content), which asks the owner to close it.
test('Web: a bottom sheet closes on a click on the backdrop', async () => {
  const onClose = vi.fn()
  const screen = await render(<Opener initiallyOpen onClosed={onClose} />)
  await screen.getByRole('heading', { name: 'Mais ações' }).click()
  await expect.element(screen.getByRole('dialog')).toBeVisible()
  ;(screen.getByRole('dialog').element() as HTMLDialogElement).click()
  expect(onClose).toHaveBeenCalledOnce()
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
})

// Drags the handle down a little, which moves the sheet with the pointer and puts it back on letting go, then past
// SHEET_CLOSE_DRAG, which asks the owner to close it.
test('Web: dragging the handle down past the threshold closes the sheet', async () => {
  const onClose = vi.fn()
  const screen = await render(<Opener initiallyOpen onClosed={onClose} />)
  const sheet = screen.getByRole('dialog', { name: 'Mais ações' })
  await dragHandle(SHEET_CLOSE_DRAG / 2)
  await expect.poll(() => getComputedStyle(sheet.element()).translate).toBe('none')
  expect(onClose).not.toHaveBeenCalled()

  await dragHandle(SHEET_CLOSE_DRAG + 20)
  expect(onClose).toHaveBeenCalledOnce()
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
})

// Opens a sheet with more choices than the screen holds and checks it stops SHEET_TOP_INSET below the top, with its
// choices scrolling inside while the title and the footer stay in view.
test('Web: a tall bottom sheet stops below the top and scrolls its content', async () => {
  const screen = await render(<Opener initiallyOpen options={Array.from({ length: 30 }, (_, index) => `Opção ${index + 1}`)} />)
  const sheet = screen.getByRole('dialog', { name: 'Mais ações' }).element().getBoundingClientRect()
  expect(sheet.top).toBeCloseTo(SHEET_TOP_INSET, 0)
  const footer = screen.getByRole('button', { name: 'Ver itens' }).element().getBoundingClientRect()
  expect(footer.bottom).toBeLessThanOrEqual(window.innerHeight)
  const body = screen.getByTestId('common.bottom-sheet.body').element()
  expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
  await expect.element(screen.getByRole('heading', { name: 'Mais ações' })).toBeInViewport()
})

// Opens and closes a sheet with motion on, and checks it rises from the bottom edge and fades in, with its backdrop,
// in the motion token, and goes back down the same way, its content kept while it leaves, inert, until its transitions
// end; with reduced motion, at once. The focus goes back to the button that opened it as soon as it closes.
test('Web: a bottom sheet rises and fades in and out, at once with reduced motion', async () => {
  const screen = await render(<Opener />)
  const opener = screen.getByRole('button', { name: 'Mais ações' })
  const overlay = {
    open: () => opener.click(),
    close: async () => {
      await userEvent.keyboard('{Escape}')
      await expect.element(opener).toHaveFocus()
    },
    find: () => document.querySelector('dialog')!,
    gone: () => !document.querySelector('[data-testid="common.bottom-sheet.layout"]'),
  }
  await expectOverlayMotion({ ...overlay, move: 'rise', backdrop: true })
  await expectOverlayAtOnce(overlay)
})

function Opener({ initiallyOpen = false, options = OPTIONS, onClosed }: { initiallyOpen?: boolean; options?: string[]; onClosed?: () => void }) {
  const [open, setOpen] = useState(initiallyOpen)
  const close = () => {
    onClosed?.()
    setOpen(false)
  }
  return (
    <>
      <Button onClick={() => setOpen(true)}>Mais ações</Button>
      <BottomSheet
        open={open}
        onClose={close}
        title="Mais ações"
        action={
          <Button variant="ghost" size="sm">
            Limpar
          </Button>
        }
        footer={<Button>Ver itens</Button>}
      >
        {options.map((option) => (
          <Button key={option} variant="ghost">
            {option}
          </Button>
        ))}
      </BottomSheet>
    </>
  )
}
