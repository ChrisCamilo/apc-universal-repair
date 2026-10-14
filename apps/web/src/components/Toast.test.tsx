import { TOAST_DURATION_MS } from '@apc/shared/dialog'
import { themes, type Mode, type Style } from '@apc/shared/theme'
import { TOAST_FADE_MS, TOAST_KIND_LOOKS, TOAST_KINDS, type ToastKind } from '@apc/shared/toast'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { Button } from './Button.tsx'
import { Dialog } from './Dialog.tsx'
import { ToastProvider } from './Toast.tsx'
import { useToast } from './toastContext.ts'

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

afterEach(async () => {
  await commands.reduceMotion(false)
})

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
})

// Shows a success toast and checks it is announced in the status region, in the success color, and that it hides on its
// own after a while.
test('Web: toasts are announced and hide on their own', async () => {
  const screen = await render(
    <ToastProvider>
      <Trigger kind="success" message="Item adicionado" />
    </ToastProvider>,
  )
  const status = screen.getByRole('status')
  await expect.element(status).toBeInTheDocument()
  await expect.element(status).toHaveTextContent('')

  await screen.getByRole('button', { name: 'Item adicionado' }).click()
  await expect.element(status).toHaveTextContent('Item adicionado')
  const pill = status.element().firstElementChild!
  expect(getComputedStyle(pill).backgroundColor).toBe(rgb(themes.eighties.night.colors.success))
  expect(getComputedStyle(pill).color).toBe(rgb(themes.eighties.night.colors.onSuccess))

  await expect.poll(() => status.element().textContent, { timeout: TOAST_DURATION_MS + 2000 }).toBe('')
})

for (const [style, mode] of [
  ['eighties', 'night'],
  ['gt4', 'day'],
] as [Style, Mode][]) {
  // Shows a toast of each kind in one night and one day theme, and checks its pill takes the kind's status color with
  // its text color, its icon is the kind's, and that errors and warnings come in an alert, read out at once, while
  // successes and infos stay in the polite status region.
  test(`Web: each toast kind has its color, icon and role in ${style}/${mode}`, async () => {
    root.dataset.style = style
    root.dataset.mode = mode
    const { colors } = themes[style][mode]
    const screen = await render(
      <ToastProvider>
        {TOAST_KINDS.map((kind) => (
          <Trigger key={kind} kind={kind} message={`Aviso de ${kind}`} />
        ))}
      </ToastProvider>,
    )
    for (const kind of TOAST_KINDS) {
      const look = TOAST_KIND_LOOKS[kind]
      await screen.getByRole('button', { name: `Aviso de ${kind}` }).click()
      const region = screen.getByRole(look.urgent ? 'alert' : 'status')
      await expect.element(region).toHaveTextContent(`Aviso de ${kind}`)
      // The toast showing; the one before it may still be fading out.
      const pill = region.element().querySelector('[data-testid="common.toast.message"]:not([aria-hidden])')!
      expect(pill.getAttribute('data-kind')).toBe(kind)
      expect([getComputedStyle(pill).backgroundColor, getComputedStyle(pill).color]).toEqual([rgb(colors[look.color]), rgb(colors[look.onColor])])
      const drawn = [...pill.querySelectorAll('svg > *')].map((shape) => shape.getAttribute('d') ?? `r${shape.getAttribute('r')}`)
      expect(drawn).toEqual(look.icon.map((shape) => (shape.kind === 'path' ? shape.d : `r${shape.kind === 'circle' ? shape.r : ''}`)))
      expect(pill.closest('[role]')!.getAttribute('role')).toBe(look.urgent ? 'alert' : 'status')
    }
    root.dataset.style = 'eighties'
    root.dataset.mode = 'night'
  })
}

// Shows one toast and then another, and checks the new message replaces the one showing.
test('Web: a new toast replaces the one showing', async () => {
  const screen = await render(
    <ToastProvider>
      <Trigger kind="success" message="Item adicionado" />
      <Trigger kind="success" message="Item excluído" />
    </ToastProvider>,
  )
  await screen.getByRole('button', { name: 'Item adicionado' }).click()
  await screen.getByRole('button', { name: 'Item excluído' }).click()
  await expect.element(screen.getByRole('status')).toHaveTextContent('Item excluído')
})

// Shows a toast and checks it fades in the app's motion duration, rising from below; once its time is up it stays in
// the page while it fades out, hidden from screen readers, and leaves it after the fade. (The opacity frame by frame is
// sampled end to end.)
test('Web: a toast fades in, and fades out before it leaves the page', async () => {
  const screen = await render(
    <ToastProvider>
      <Trigger kind="success" message="Item adicionado" />
    </ToastProvider>,
  )
  await screen.getByRole('button', { name: 'Item adicionado' }).click()
  const pill = screen.getByTestId('common.toast.message')
  await expect.element(pill).toBeVisible()
  const look = getComputedStyle(pill.element())
  expect([look.transitionProperty, look.transitionDuration]).toEqual(['opacity, translate', `${TOAST_FADE_MS / 1000}s`])

  await expect.element(pill, { timeout: TOAST_DURATION_MS + 1000 }).toHaveAttribute('aria-hidden', 'true')
  await expect.poll(() => pill.query(), { timeout: TOAST_FADE_MS + 1000 }).toBeNull()
})

// Shows one toast and then another, and checks the first fades out under the second, hidden from screen readers, and
// leaves the page once it faded, while the second stays.
test('Web: a replaced toast fades out under the new one', async () => {
  const screen = await render(
    <ToastProvider>
      <Trigger kind="success" message="Item adicionado" />
      <Trigger kind="error" message="Não foi possível excluir o item. Tente de novo." />
    </ToastProvider>,
  )
  await screen.getByRole('button', { name: 'Item adicionado' }).click()
  await screen.getByRole('button', { name: 'Não foi possível excluir o item. Tente de novo.' }).click()
  const old = screen.getByTestId('common.toast.message').filter({ hasText: 'Item adicionado' })
  const next = screen.getByRole('alert').getByTestId('common.toast.message')
  await expect.element(old).toHaveAttribute('aria-hidden', 'true')
  await expect.element(next).not.toHaveAttribute('aria-hidden')
  const [oldBox, nextBox] = [old.element().getBoundingClientRect(), next.element().getBoundingClientRect()]
  expect(Math.abs(oldBox.bottom - nextBox.bottom)).toBeLessThanOrEqual(8)
  await expect.poll(() => old.query(), { timeout: TOAST_FADE_MS + 1000 }).toBeNull()
  await expect.element(next).toBeVisible()
})

// Turns on reduced motion and checks a toast neither fades nor moves.
test('Web: with reduced motion a toast shows and hides at once', async () => {
  await commands.reduceMotion(true)
  const screen = await render(
    <ToastProvider>
      <Trigger kind="info" message="Nenhuma alteração para salvar." />
    </ToastProvider>,
  )
  await screen.getByRole('button', { name: 'Nenhuma alteração para salvar.' }).click()
  const pill = screen.getByTestId('common.toast.message')
  await expect.element(pill).toBeVisible()
  expect(getComputedStyle(pill.element()).transitionProperty).toBe('none')
  expect(getComputedStyle(pill.element()).opacity).toBe('1')
})

// Shows a toast from inside an open modal dialog and checks the toasts' region is raised into the top layer after the
// dialog opened, so the toast shows above it, at the bottom of the screen.
test('Web: a toast shows above an open dialog', async () => {
  const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal')
  const showPopover = vi.spyOn(HTMLElement.prototype, 'showPopover')
  const screen = await render(
    <ToastProvider>
      <Dialog open onClose={() => {}} title="Novo item" actions={null}>
        <Trigger kind="success" message="Categoria “Motor diesel” criada." />
      </Dialog>
    </ToastProvider>,
  )
  await screen.getByRole('button', { name: 'Categoria “Motor diesel” criada.' }).click()
  const status = screen.getByRole('status')
  await expect.element(status).toHaveTextContent('Categoria “Motor diesel” criada.')
  expect(status.element().parentElement!.matches(':popover-open')).toBe(true)
  expect(showPopover.mock.invocationCallOrder.at(-1)).toBeGreaterThan(showModal.mock.invocationCallOrder[0])
  const pill = status.element().firstElementChild!.getBoundingClientRect()
  expect(pill.bottom).toBeLessThanOrEqual(window.innerHeight)
  expect(pill.top).toBeGreaterThan(window.innerHeight / 2)
})

function Trigger({ kind, message }: { kind: ToastKind; message: string }) {
  const toast = useToast()
  return <Button onClick={() => toast[kind](message)}>{message}</Button>
}
