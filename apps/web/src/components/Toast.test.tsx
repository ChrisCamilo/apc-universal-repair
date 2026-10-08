import { TOAST_DURATION_MS } from '@apc/shared/dialog'
import { themes } from '@apc/shared/theme'
import { beforeAll, expect, test, vi } from 'vitest'
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

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
})

// Shows a toast and checks it is announced in the status region, in the text color turned around on the
// canvas, and that it hides on its own after a while.
test('Web: toasts are announced and hide on their own', async () => {
  const screen = await render(
    <ToastProvider>
      <Trigger message="Item adicionado" />
    </ToastProvider>,
  )
  const status = screen.getByRole('status')
  await expect.element(status).toBeInTheDocument()
  await expect.element(status).toHaveTextContent('')

  await screen.getByRole('button', { name: 'Item adicionado' }).click()
  await expect.element(status).toHaveTextContent('Item adicionado')
  const pill = status.element().firstElementChild!
  expect(getComputedStyle(pill).backgroundColor).toBe(rgb(themes.eighties.night.colors.text))
  expect(getComputedStyle(pill).color).toBe(rgb(themes.eighties.night.colors.canvas))

  await expect.poll(() => status.element().textContent, { timeout: TOAST_DURATION_MS + 2000 }).toBe('')
})

// Shows one toast and then another, and checks the new message replaces the one showing.
test('Web: a new toast replaces the one showing', async () => {
  const screen = await render(
    <ToastProvider>
      <Trigger message="Item adicionado" />
      <Trigger message="Item excluído" />
    </ToastProvider>,
  )
  await screen.getByRole('button', { name: 'Item adicionado' }).click()
  await screen.getByRole('button', { name: 'Item excluído' }).click()
  await expect.element(screen.getByRole('status')).toHaveTextContent('Item excluído')
})

// Shows a toast from inside an open modal dialog and checks the status region is raised into the top layer after the
// dialog opened, so the toast shows above it, at the bottom of the screen.
test('Web: a toast shows above an open dialog', async () => {
  const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal')
  const showPopover = vi.spyOn(HTMLElement.prototype, 'showPopover')
  const screen = await render(
    <ToastProvider>
      <Dialog open onClose={() => {}} title="Novo item" actions={null}>
        <Trigger message="Categoria “Motor diesel” criada." />
      </Dialog>
    </ToastProvider>,
  )
  await screen.getByRole('button', { name: 'Categoria “Motor diesel” criada.' }).click()
  const status = screen.getByRole('status')
  await expect.element(status).toHaveTextContent('Categoria “Motor diesel” criada.')
  expect(status.element().matches(':popover-open')).toBe(true)
  expect(showPopover.mock.invocationCallOrder.at(-1)).toBeGreaterThan(showModal.mock.invocationCallOrder[0])
  const pill = status.element().firstElementChild!.getBoundingClientRect()
  expect(pill.bottom).toBeLessThanOrEqual(window.innerHeight)
  expect(pill.top).toBeGreaterThan(window.innerHeight / 2)
})

function Trigger({ message }: { message: string }) {
  const toast = useToast()
  return <Button onClick={() => toast(message)}>{message}</Button>
}
