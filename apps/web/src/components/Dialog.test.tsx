import { useState } from 'react'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { Button } from './Button.tsx'
import { Dialog } from './Dialog.tsx'
import { TextField } from './TextField.tsx'

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

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  await page.viewport(1280, 720)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens a dialog in one style and mode and checks the panel fill, the hairline frame, the title in the
    // display face and the backdrop: the canvas at 72%.
    test(`Web: dialogs follow the ${style}/${mode} theme`, async () => {
      const theme = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<Opener initiallyOpen />)
      const dialog = screen.getByRole('dialog', { name: 'Excluir item?' })
      await expect.element(dialog).toBeVisible()
      const box = getComputedStyle(dialog.element())
      expect(box.backgroundColor).toBe(rgb(theme.colors.panel))
      expect(box.borderTopColor).toBe(rgb(theme.colors.hairline))
      expect(getComputedStyle(dialog.element(), '::backdrop').backgroundColor).toBe(mixed(theme.colors.canvas, 72))
      expect(getComputedStyle(screen.getByRole('heading', { name: 'Excluir item?' }).element()).fontFamily).toMatch(
        new RegExp(`^"?${theme.displayFont}`),
      )
    })
  }
}

// Opens a confirmation from a button and checks the focus starts on Cancel and never reaches the page behind
// on Tab (the browser may take it to its own controls past the last button), then Escape asks the owner to
// close it and the focus goes back to the button that opened it.
test('Web: dialogs keep the focus inside and give it back on Escape', async () => {
  const onClose = vi.fn()
  const screen = await render(<Opener onClosed={onClose} />)
  const opener = screen.getByRole('button', { name: 'Excluir item' })
  await opener.click()
  await expect.element(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  await userEvent.keyboard('{Tab}')
  await expect.element(screen.getByRole('button', { name: 'Excluir', exact: true })).toHaveFocus()
  await userEvent.keyboard('{Tab}')
  const active = document.activeElement
  expect(active === document.body || screen.getByRole('dialog').element().contains(active)).toBe(true)

  await userEvent.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalledOnce()
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
  await expect.element(opener).toHaveFocus()
})

// Clicks the backdrop (the dialog element itself, around its content) and the content of a regular dialog and of a
// dismissible one, and checks only the dismissible one closes, and only on the backdrop.
test('Web: only a dismissible dialog closes on a click outside', async () => {
  const kept = await render(<Opener initiallyOpen />)
  const backdrop = (dialog: HTMLElement | SVGElement) => (dialog as HTMLDialogElement).click()
  backdrop(kept.getByRole('dialog').element())
  await expect.element(kept.getByRole('dialog')).toBeVisible()
  await kept.getByRole('button', { name: 'Cancelar' }).click()

  const onClose = vi.fn()
  const screen = await render(<Opener initiallyOpen dismissible onClosed={onClose} />)
  await screen.getByText('Não dá para desfazer.').click()
  await expect.element(screen.getByRole('dialog')).toBeVisible()
  backdrop(screen.getByRole('dialog').element())
  expect(onClose).toHaveBeenCalledOnce()
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
})

// Closes a dialog with its Cancel button and checks it goes away.
test('Web: Cancel closes the dialog', async () => {
  const screen = await render(<Opener initiallyOpen />)
  await screen.getByRole('button', { name: 'Cancelar' }).click()
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
})

// Opens a long form at 1280×720 and at 360×780 and checks it fits the screen with its content scrolling
// Cancels a file picker opened from a field inside the dialog, whose "cancel" event bubbles up to the dialog,
// and checks the dialog stays open; Escape on the dialog still asks the owner to close it.
test('Web: a canceled file picker leaves the dialog open', async () => {
  const onClose = vi.fn()
  const screen = await render(
    <Dialog open onClose={onClose} title="Novo item" actions={null}>
      <input type="file" aria-label="Fotos" />
    </Dialog>,
  )
  screen.getByLabelText('Fotos').element().dispatchEvent(new Event('cancel', { bubbles: true }))
  expect(onClose).not.toHaveBeenCalled()
  await expect.element(screen.getByRole('dialog')).toBeVisible()
  await userEvent.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalledTimes(1)
})

// while Save stays visible without scrolling, and that each size keeps its width.
test('Web: long dialogs scroll inside with the actions pinned', async () => {
  for (const [width, height] of [
    [1280, 720],
    [360, 780],
  ]) {
    await page.viewport(width, height)
    const screen = await render(<LongForm />)
    const dialog = screen.getByRole('dialog', { name: 'Novo item' }).element().getBoundingClientRect()
    const save = screen.getByRole('button', { name: 'Salvar item' }).element().getBoundingClientRect()
    expect(dialog.width).toBeCloseTo(Math.min(560, window.innerWidth - 32), 0)
    expect(dialog.bottom).toBeLessThanOrEqual(window.innerHeight)
    expect(save.bottom).toBeLessThan(dialog.bottom)
    const body = screen.getByLabelText('Nome').element().closest('.overflow-y-auto')!
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
    await screen.unmount()
  }
  await page.viewport(1280, 720)
})

function LongForm() {
  return (
    <Dialog open onClose={() => {}} title="Novo item" actions={<Button size="sm">Salvar item</Button>}>
      {['Nome', 'Código', 'Categoria', 'Marca', 'Veículo', 'Modelo', 'Cor', 'Local', 'Valor', 'Quantidade', 'Mínimo'].map((label) => (
        <TextField key={label} label={label} value="" onValueChange={() => {}} />
      ))}
    </Dialog>
  )
}

function Opener({
  initiallyOpen = false,
  dismissible,
  onClosed,
}: {
  initiallyOpen?: boolean
  dismissible?: boolean
  onClosed?: () => void
}) {
  const [open, setOpen] = useState(initiallyOpen)
  const close = () => {
    setOpen(false)
    onClosed?.()
  }
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Excluir item
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title="Excluir item?"
        size="confirm"
        dismissible={dismissible}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" onClick={() => setOpen(false)}>
              Excluir
            </Button>
          </>
        }
      >
        <p>Não dá para desfazer.</p>
      </Dialog>
    </>
  )
}
