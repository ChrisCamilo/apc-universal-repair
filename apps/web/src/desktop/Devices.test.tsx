import { DEVICE_MESSAGES, type Device } from '@apc/shared/devices'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import '../index.css'
import { DEMO_UNAVAILABLE } from '../demo/demoApi.ts'
import { themeCss } from '../theme.ts'
import { DeviceApprovals } from './DeviceApprovals.tsx'
import { DEVICES_FAILED } from './devices.ts'
import { DevicesDialog } from './DevicesDialog.tsx'

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
        : Response.json({ statusCode: listStatus, message: listStatus === 501 ? DEMO_UNAVAILABLE : 'Devices are managed only on the server\'s computer.' }, { status: listStatus })
    }
    const id = url.split('/devices/')[1].split('/')[0]
    const device = devices.find((each) => each.id === id)!
    if (method === 'DELETE') {
      return new Response(null, { status: 204 })
    }
    const name = (JSON.parse(String(init!.body)) as { name: string }).name.trim() || `Dispositivo ${device.code}`
    return Response.json({ ...device, status: 'authorized', name })
  })
  vi.stubGlobal('fetch', api)
  return api
}

// Lists a device waiting for authorization and checks the dialog asks about it with whose login it is and its code,
// and a Windows notification is asked for once; "Autorizar" sends the name typed and the dialog goes away.
test('Web: a waiting device is asked about on the server\'s computer and authorized with a name', async () => {
  const notify = vi.fn()
  window.apcDesktop = { notify, onOpenNotifications: () => () => {}, onUpdateReady: () => () => {}, restartToUpdate: () => {} }
  const api = serveDevices([DEVICE])
  const screen = await render(<DeviceApprovals />)
  const dialog = screen.getByRole('dialog', { name: DEVICE_MESSAGES.approveTitle })
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
  await expect.element(demo.getByRole('alert')).toHaveTextContent(DEMO_UNAVAILABLE)
  await demo.unmount()

  serveDevices([], 403)
  const elsewhere = await render(<DevicesDialog open onClose={() => {}} />)
  await expect.element(elsewhere.getByRole('alert')).toHaveTextContent(DEVICES_FAILED.elsewhere)
})
