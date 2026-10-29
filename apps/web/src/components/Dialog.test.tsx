import { useState } from 'react'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { expectOverlayAtOnce, expectOverlayMotion } from '../test-motion.ts'
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
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
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

// Opens and closes a dialog with motion on, and checks it grows and fades in, with its backdrop, in the motion token,
// and goes back the same way, its content kept while it leaves, inert, until its transitions end; with reduced motion,
// at once. The focus goes back to the button that opened it as soon as it closes, either way.
test('Web: a dialog grows and fades in and out, at once with reduced motion', async () => {
  const screen = await render(<Opener />)
  const opener = screen.getByRole('button', { name: 'Excluir item' })
  const overlay = {
    open: () => opener.click(),
    close: async () => {
      await screen.getByRole('button', { name: 'Cancelar' }).click()
      await expect.element(opener).toHaveFocus()
    },
    find: () => document.querySelector('dialog')!,
    gone: () => !document.querySelector('[data-testid="common.dialog.layout"]'),
  }
  await expectOverlayMotion({ ...overlay, move: 'scale', backdrop: true })
  await expectOverlayAtOnce(overlay)
})

// Opens a closable form and checks the × sits at the top right, beside the title, while the focus starts on the
// first field, past it; the × asks the owner to close it. A dialog that isn't closable has no ×.
test('Web: a closable dialog closes on the × at the top right', async () => {
  const onClose = vi.fn()
  const screen = await render(
    <Dialog open onClose={onClose} title="Novo item" closable actions={<Button size="sm">Salvar</Button>}>
      <TextField label="Nome" value="" onValueChange={() => {}} />
    </Dialog>,
  )
  const close = screen.getByRole('button', { name: 'Fechar' })
  await expect.element(screen.getByLabelText('Nome')).toHaveFocus()
  const dialog = screen.getByRole('dialog', { name: 'Novo item' }).element().getBoundingClientRect()
  const box = close.element().getBoundingClientRect()
  const title = screen.getByRole('heading', { name: 'Novo item' }).element().getBoundingClientRect()
  // In the corner, past only the dialog's 1px frame and 24px padding.
  expect(dialog.right - box.right).toBeLessThanOrEqual(25)
  expect(box.top - dialog.top).toBeLessThanOrEqual(25)
  expect(box.left).toBeGreaterThanOrEqual(title.right)
  await close.click()
  expect(onClose).toHaveBeenCalledOnce()
  await screen.unmount()

  const plain = await render(<Opener initiallyOpen />)
  await expect.element(plain.getByRole('button', { name: 'Fechar' })).not.toBeInTheDocument()
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

// while Save stays visible without scrolling: a window as wide as its size allows on the desktop, the whole screen on
// a phone.
test('Web: long dialogs scroll inside with the actions pinned', async () => {
  for (const [width, height] of [
    [MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT],
    [MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT],
  ]) {
    await page.viewport(width, height)
    const screen = await render(<LongForm />)
    const dialog = screen.getByRole('dialog', { name: 'Novo item' }).element().getBoundingClientRect()
    const save = screen.getByRole('button', { name: 'Salvar item' }).element().getBoundingClientRect()
    expect(dialog.width).toBeCloseTo(width === MIN_MOBILE_WIDTH ? window.innerWidth : 560, 0)
    expect(dialog.bottom).toBeLessThanOrEqual(window.innerHeight)
    expect(save.bottom).toBeLessThan(dialog.bottom)
    const body = screen.getByLabelText('Nome').element().closest('.overflow-y-auto')!
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
    await screen.unmount()
  }
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

// Opens a closable form at 360×780 in every style and mode, and checks it fills the screen with no rounded corners,
// its title row pinned on top with the × at its left while the fields scroll, and its actions at the bottom; the focus
// starts on the first field and Escape asks the owner to close it.
test('Web: on a phone a form fills the screen, its title on top and its actions at the bottom', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  for (const style of STYLES) {
    for (const mode of MODES) {
      root.dataset.style = style
      root.dataset.mode = mode
      const onClose = vi.fn()
      const screen = await render(<LongForm closable onClose={onClose} />)
      const dialog = screen.getByRole('dialog', { name: 'Novo item' })
      const window_ = dialog.element().getBoundingClientRect()
      expect([window_.left, window_.top, window_.width, window_.height]).toEqual([0, 0, innerWidth, innerHeight])
      expect(getComputedStyle(dialog.element()).borderTopLeftRadius).toBe('0px')
      expect(getComputedStyle(dialog.element()).backgroundColor).toBe(rgb(themes[style][mode].colors.panel))
      await expect.element(screen.getByLabelText('Nome')).toHaveFocus()

      const body = screen.getByTestId('common.dialog.body').element()
      body.scrollTop = body.scrollHeight
      const header = screen.getByTestId('common.dialog.body.header').element().getBoundingClientRect()
      expect(header.top).toBeCloseTo(0, 0)
      const close = screen.getByRole('button', { name: 'Fechar' }).element().getBoundingClientRect()
      const title = screen.getByRole('heading', { name: 'Novo item' }).element().getBoundingClientRect()
      expect(close.right).toBeLessThanOrEqual(title.left)
      const save = screen.getByRole('button', { name: 'Salvar item' }).element().getBoundingClientRect()
      expect(save.bottom).toBeGreaterThan(innerHeight - 40)
      expect(save.bottom).toBeLessThanOrEqual(innerHeight)
      // The home indicator's inset, or 16px on a screen with none, as here.
      expect(getComputedStyle(screen.getByTestId('common.dialog.actions').element()).paddingBottom).toBe('16px')

      await userEvent.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledOnce()
      await screen.unmount()
    }
  }
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

// Opens a confirmation at 360×780 and checks it stays a centered box, 16px from the screen's sides, with its rounded
// corners and the page dimmed around it.
test('Web: on a phone a confirmation stays a centered box', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  const screen = await render(<Opener initiallyOpen />)
  const dialog = screen.getByRole('dialog', { name: 'Excluir item?' }).element()
  const box = dialog.getBoundingClientRect()
  expect(box.left).toBeCloseTo(16, 0)
  expect(box.width).toBeCloseTo(innerWidth - 32, 0)
  expect(box.height).toBeLessThan(innerHeight / 2)
  expect(box.top + box.height / 2).toBeCloseTo(innerHeight / 2, 0)
  expect(getComputedStyle(dialog).borderTopLeftRadius).not.toBe('0px')
  await screen.unmount()
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

// Opens and closes a form at 360×780 with motion on, and checks it slides up from the bottom edge and fades in, with
// its backdrop, in the motion token, and goes back down the same way; with reduced motion, at once.
test('Web: on a phone a form slides up and back down, at once with reduced motion', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  const screen = await render(<FormOpener />)
  const opener = screen.getByRole('button', { name: 'Novo item' })
  const overlay = {
    open: () => opener.click(),
    close: async () => {
      await userEvent.keyboard('{Escape}')
      await expect.element(opener).toHaveFocus()
    },
    find: () => document.querySelector('dialog')!,
    gone: () => !document.querySelector('[data-testid="common.dialog.layout"]'),
  }
  try {
    await expectOverlayMotion({ ...overlay, move: 'rise', backdrop: true })
    await expectOverlayAtOnce(overlay)
  } finally {
    await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
  }
})

function FormOpener() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Novo item</Button>
      <LongForm open={open} closable onClose={() => setOpen(false)} />
    </>
  )
}

function LongForm({ open = true, closable = false, onClose = () => {} }: { open?: boolean; closable?: boolean; onClose?: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Novo item" closable={closable} actions={<Button size="sm">Salvar item</Button>}>
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
