import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import type { DesktopBridge } from './desktopBridge.ts'
import { UpdateNotice } from './UpdateNotice.tsx'

const root = document.documentElement

/**
 * Gives the page a desktop bridge, as the desktop app's preload does.
 * @returns The way to say a version is ready, and the restart call.
 */
function giveBridge(): { ready: (version: string) => void; restartToUpdate: DesktopBridge['restartToUpdate'] } {
  let ready: (version: string) => void = () => {}
  const restartToUpdate = vi.fn()
  window.apcDesktop = {
    notify: () => {},
    onOpenNotifications: () => () => {},
    onUpdateReady: (listener) => {
      ready = listener
      return () => {}
    },
    restartToUpdate,
  }
  return { ready: (version) => ready(version), restartToUpdate }
}

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
})

afterEach(() => {
  delete window.apcDesktop
})

// In a browser there is no desktop bridge: the notice draws nothing, not even its live region.
test('Web: in a browser the update notice draws nothing', async () => {
  const screen = await render(<UpdateNotice />)
  expect(screen.container.childElementCount).toBe(0)
})

// In the desktop app the live region is there and empty until a version is ready; then the notice says which and that
// it goes in on closing, and "Reiniciar agora" asks the desktop app to restart into it.
test('Web: in the desktop app the notice shows when a version is ready, and restarts into it', async () => {
  const bridge = giveBridge()
  const screen = await render(<UpdateNotice />)
  const region = screen.getByRole('status')
  await expect.element(region).toBeInTheDocument()
  await expect.element(region).toBeEmptyDOMElement()

  bridge.ready('0.2.1')
  await expect.element(region.getByText('Nova versão 0.2.1 pronta. Ela será instalada quando você fechar o app.')).toBeVisible()
  await screen.getByRole('button', { name: 'Reiniciar agora' }).click()
  expect(bridge.restartToUpdate).toHaveBeenCalledOnce()
})

// "Depois" hides the notice and doesn't restart; the live region stays.
test('Web: "Depois" hides the update notice without restarting', async () => {
  const bridge = giveBridge()
  const screen = await render(<UpdateNotice />)
  bridge.ready('0.2.1')
  await screen.getByRole('button', { name: 'Depois' }).click()
  await expect.element(screen.getByRole('status')).toBeEmptyDOMElement()
  await expect.element(screen.getByRole('button', { name: 'Reiniciar agora' })).not.toBeInTheDocument()
  expect(bridge.restartToUpdate).not.toHaveBeenCalled()
})
