import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import type { ServerBridge, ServerFailure as Failure } from './desktopBridge.ts'
import { ServerFailure } from './ServerFailure.tsx'
import { ServerSettingsContext } from './serverSettingsContext.ts'

const LOG = 'C:\\Users\\ana\\AppData\\Roaming\\APC Universal Repair\\logs\\api.log'
// The server stopped as it started, with the error its log ends with.
const STOPPED: Failure = { kind: 'stopped', reason: 'O servidor parou ao ligar, várias vezes seguidas. Último erro: file is not a database', log: LOG }
const root = document.documentElement

/**
 * Gives the page a desktop bridge whose server isn't on, as the desktop app's preload does.
 * @param failure Why the server isn't on when the page asks, or null while it is.
 * @returns The bridge's failure and retry calls, and the way to say the server failed later.
 */
function giveServer(failure: Failure | null) {
  let failed: (found: Failure) => void = () => {}
  const calls = {
    failure: vi.fn<ServerBridge['failure']>(async () => failure),
    retry: vi.fn<ServerBridge['retry']>(async () => true),
  }
  window.apcDesktop = {
    notify: () => {},
    onOpenNotifications: () => () => {},
    onUpdateReady: () => () => {},
    restartToUpdate: () => {},
    server: {
      ...calls,
      onFailure: (listener: (found: Failure) => void) => {
        failed = listener
        return () => {}
      },
    } as unknown as ServerBridge,
  }
  return { calls, fail: (found: Failure) => failed(found) }
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

// In a browser, and in the desktop app while its server is on, the screen draws nothing.
test('Web: the server failure screen draws nothing while the server is on', async () => {
  const browser = await render(<ServerFailure />)
  expect(browser.container.childElementCount).toBe(0)
  giveServer(null)
  const desktop = await render(<ServerFailure />)
  expect(desktop.container.childElementCount).toBe(0)
})

// Opens with the server already off, and checks the screen says it didn't start, why and where its log is, and that
// "Tentar de novo" starts it again and opens the app once it answers.
test('Web: a server that didn\'t start is said so, with why and its log, and tried again', async () => {
  const { calls } = giveServer(STOPPED)
  const reload = vi.fn()
  const screen = await render(<ServerFailure reload={reload} />)
  const alert = screen.getByRole('alert')
  await expect.element(alert.getByRole('heading', { name: 'O servidor não ligou' })).toBeVisible()
  await expect.element(alert.getByText(`${STOPPED.reason} O registro do servidor está em ${LOG}.`)).toBeVisible()
  await screen.getByRole('button', { name: 'Tentar de novo' }).click()
  await vi.waitFor(() => expect(reload).toHaveBeenCalledOnce())
  expect(calls.retry).toHaveBeenCalledOnce()
})

// Opens with the port held by another program, and checks the screen names it, with no log to look at, and that
// "Usar outra porta" opens the Servidor dialog on its port field.
test('Web: a taken port is said so, and leads to the port field', async () => {
  const reason = 'A porta 3000 já está em uso pelo programa node.exe (processo 4321). Feche esse programa e tente de novo, ou use outra porta.'
  giveServer({ kind: 'portInUse', reason, log: LOG })
  const openSettings = vi.fn()
  const screen = await render(
    <ServerSettingsContext.Provider value={openSettings}>
      <ServerFailure />
    </ServerSettingsContext.Provider>,
  )
  await expect.element(screen.getByRole('alert').getByText(reason, { exact: true })).toBeVisible()
  await screen.getByRole('button', { name: 'Usar outra porta' }).click()
  expect(openSettings).toHaveBeenCalledWith('port')
  await expect.element(screen.getByRole('button', { name: 'Como liberar a porta' })).toBeVisible()
})

// Opens with the server on, then hears it failed, and checks the screen shows; a retry that still fails shows why
// again, with the newer reason, and doesn't open the app.
test('Web: a server that fails later is said so, and a failed retry says why again', async () => {
  const { calls, fail } = giveServer(null)
  const reload = vi.fn()
  const screen = await render(<ServerFailure reload={reload} />)
  fail({ kind: 'timeout', reason: 'O servidor não respondeu a tempo.', log: LOG })
  await expect.element(screen.getByRole('alert').getByText(/^O servidor não respondeu a tempo\. O registro/)).toBeVisible()

  calls.retry.mockResolvedValueOnce(false)
  calls.failure.mockResolvedValueOnce(STOPPED)
  await screen.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect.element(screen.getByRole('alert').getByText(/Último erro: file is not a database/)).toBeVisible()
  expect(reload).not.toHaveBeenCalled()
})
