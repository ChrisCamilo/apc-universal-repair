import { DEVICE_MESSAGES, type Device } from '@apc/domain/devices'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import '../../index.css'
import { WEB_TEXTS } from '../../app/webTexts.ts'
import { themeCss } from '../../app/theme.ts'
import { DeviceApprovals } from './DeviceApprovals.tsx'
import { DESKTOP_TEXTS } from './desktopTexts.ts'
import { DevicesDialog } from './DevicesDialog.tsx'
import { LocaleContext } from '../../app/useLocale.ts'

// The devices' screens on the server's computer, with the API stood in for: the approval of a waiting device and the
// list of authorized ones; and what each says when the API can't list them.

/** A device, as the API lists it. */
const DEVICE: Device = {
  id: 'd1',
  username: 'ana.souza',
  displayName: 'Ana Souza',
  name: '',
  code: 'K7Q2ZD',
  status: 'pending',
  createdAt: '2026-11-04T21:00:00.000Z',
  approvedAt: null,
  lastUsedAt: null,
  current: false,
}

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete window.apcDesktop
})

/**
 * Stands in for the API's devices' routes.
 * @param devices The devices it lists.
 * @param listStatus The status of the list, e.g. 501 for the demo.
 * @returns The stand-in, to check what was sent.
 */
function serveDevices(devices: Device[], listStatus = 200) {
  const api = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url.endsWith('/devices') && method === 'GET') {
      return listStatus === 200
        ? Response.json({ devices })
        : Response.json(
            listStatus === 501
              ? { statusCode: 501, message: WEB_TEXTS['pt-BR'].demo.unavailable }
              : { statusCode: 403, error: 'Forbidden', message: 'Devices are managed only on the server\'s computer.', reason: 'notOnServer' },
            { status: listStatus },
          )
    }
    const id = url.split('/devices/')[1].split('/')[0]
    const device = devices.find((each) => each.id === id)!
    if (method === 'DELETE') {
      return new Response(null, { status: 204 })
    }
    const name = (JSON.parse(String(init!.body)) as { name: string }).name.trim()
    return Response.json({ ...device, status: 'authorized', name })
  })
  vi.stubGlobal('fetch', api)
  return api
}

// Lists a device waiting for authorization and checks the dialog asks about it with whose login it is and its code,
// and a Windows notification is asked for once; "Autorizar" sends the name typed and the dialog goes away.
test('Web: a waiting device is asked about on the server\'s computer and authorized with a name', async () => {
  const notify = vi.fn()
  window.apcDesktop = { notify, onOpenNotifications: () => () => {}, onUpdateReady: () => () => {}, restartToUpdate: () => {}, setLocale: () => {} }
  const api = serveDevices([DEVICE])
  const screen = await render(<DeviceApprovals />)
  const dialog = screen.getByRole('dialog', { name: DEVICE_MESSAGES['pt-BR'].approveTitle })
  await expect.element(dialog).toBeVisible()
  await expect.element(dialog.getByText('Ana Souza (ana.souza) quer entrar por um dispositivo novo.', { exact: false })).toBeVisible()
  await expect.element(dialog.getByText('K7Q2ZD', { exact: true })).toBeVisible()
  expect(notify).toHaveBeenCalledWith('Dispositivo novo', 'Ana Souza quer entrar por um dispositivo novo, código K7Q2ZD.')

  await dialog.getByLabelText('Nome do dispositivo').fill('Celular da Ana')
  await dialog.getByRole('button', { name: 'Autorizar' }).click()
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
  const sent = api.mock.calls.find(([, init]) => init?.method === 'POST')!
  expect([String(sent[0]), JSON.parse(String(sent[1]!.body))]).toEqual(['/api/devices/d1/authorize', { name: 'Celular da Ana' }])
})

// Refuses a waiting device and checks it is removed and the dialog goes away.
test('Web: a waiting device can be refused', async () => {
  const api = serveDevices([DEVICE])
  const screen = await render(<DeviceApprovals />)
  await screen.getByRole('button', { name: 'Recusar' }).click()
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
  expect(api.mock.calls.some(([url, init]) => String(url) === '/api/devices/d1' && init?.method === 'DELETE')).toBe(true)
})

// Opens Dispositivos with an authorized phone and the computer in use, and checks each shows its name and whose it is,
// only the phone can be removed, renaming saves the name typed, and removing asks first.
test('Web: Dispositivos lists the authorized devices, to rename and remove', async () => {
  const phone = { ...DEVICE, status: 'authorized' as const, name: 'Celular da Ana', lastUsedAt: '2026-11-04T21:30:00.000Z' }
  const here = { ...DEVICE, id: 'd2', status: 'authorized' as const, name: 'Este computador', current: true }
  const api = serveDevices([phone, here, { ...DEVICE, id: 'd3' }])
  const screen = await render(<DevicesDialog open onClose={() => {}} />)
  const list = screen.getByRole('list', { name: 'Dispositivos autorizados' })
  await expect.element(list.getByText('Celular da Ana')).toBeVisible()
  await expect.element(list.getByText('Este computador (este dispositivo)')).toBeVisible()
  expect(list.getByRole('listitem').elements()).toHaveLength(2)
  expect(list.getByRole('button', { name: 'Remover' }).elements()).toHaveLength(1)

  await list.getByRole('button', { name: 'Renomear' }).first().click()
  await list.getByLabelText('Nome do dispositivo').fill('Celular da oficina')
  await list.getByRole('button', { name: 'Salvar' }).click()
  await expect.element(list.getByText('Celular da oficina')).toBeVisible()

  await list.getByRole('button', { name: 'Remover' }).click()
  await expect.element(screen.getByText('Remover encerra as sessões do dispositivo.', { exact: false })).toBeVisible()
  await list.getByRole('button', { name: 'Remover mesmo assim' }).click()
  await expect.element(list.getByText('Celular da oficina')).not.toBeInTheDocument()
  expect(api.mock.calls.some(([url, init]) => String(url) === '/api/devices/d1' && init?.method === 'DELETE')).toBe(true)
})

// Opens Dispositivos in the web app's demo, which doesn't authorize devices, and off the server's computer, and checks
// each says why there is no list.
test('Web: Dispositivos says why it can\'t list the devices', async () => {
  serveDevices([], 501)
  const demo = await render(<DevicesDialog open onClose={() => {}} />)
  await expect.element(demo.getByRole('alert')).toHaveTextContent(WEB_TEXTS['pt-BR'].demo.unavailable)
  await demo.unmount()

  serveDevices([], 403)
  const elsewhere = await render(<DevicesDialog open onClose={() => {}} />)
  await expect.element(elsewhere.getByRole('alert')).toHaveTextContent(DESKTOP_TEXTS['pt-BR'].devicesFailed.elsewhere)
})

// Lists a device authorized without a name, which the API keeps empty, and checks it is shown by its code in Portuguese
// and, with English chosen, in English.
test('Web: a device given no name is shown by its code, in the language chosen', async () => {
  serveDevices([{ ...DEVICE, status: 'authorized' }])
  const portuguese = await render(<DevicesDialog open onClose={() => {}} />)
  await expect.element(portuguese.getByRole('list', { name: 'Dispositivos autorizados' }).getByText('Dispositivo K7Q2ZD')).toBeVisible()
  await portuguese.unmount()

  const english = await render(
    <LocaleContext.Provider value={{ locale: 'en-US', setLocale: () => {} }}>
      <DevicesDialog open onClose={() => {}} />
    </LocaleContext.Provider>,
  )
  await expect.element(english.getByRole('list', { name: 'Authorized devices' }).getByText('Device K7Q2ZD')).toBeVisible()
})

// Opens Dispositivos in English, and checks the list, a device never used, this device and removing read in English.
test('Web: Dispositivos reads in English', async () => {
  const phone = { ...DEVICE, status: 'authorized' as const, name: 'Celular da Ana' }
  const here = { ...DEVICE, id: 'd2', status: 'authorized' as const, name: 'Este computador', current: true }
  serveDevices([phone, here])
  const screen = await render(
    <LocaleContext.Provider value={{ locale: 'en-US', setLocale: () => {} }}>
      <DevicesDialog open onClose={() => {}} />
    </LocaleContext.Provider>,
  )
  const list = screen.getByRole('dialog', { name: 'Devices' }).getByRole('list', { name: 'Authorized devices' })
  await expect.element(list.getByText('Este computador (this device)')).toBeVisible()
  await expect.element(list.getByText(/hasn't logged in yet/).first()).toBeVisible()
  await list.getByRole('button', { name: 'Remove' }).click()
  await expect.element(screen.getByText(/Removing ends the device’s sessions/)).toBeVisible()
  await expect.element(list.getByRole('button', { name: 'Remove anyway' })).toBeVisible()
})
