import { MIN_DESKTOP_WIDTH, MIN_WINDOW_HEIGHT } from '@apc/shared/screens'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import type { ServerBridge, ServerSettings } from './desktopBridge.ts'
import { ServerSettingsProvider } from './ServerSettings.tsx'
import { useOpenServerSettings } from './serverSettingsContext.ts'

/** The app's own server on SQLite, as a fresh install has it. */
const ON_SQLITE: ServerSettings = {
  kind: 'own',
  database: 'sqlite',
  location: 'C:\\Users\\ana\\AppData\\Roaming\\APC Universal Repair\\data',
  photos: 'C:\\Users\\ana\\AppData\\Roaming\\APC Universal Repair\\data\\photos',
  port: 3333,
  phoneAddress: '192.168.0.10',
  needsAddress: false,
}
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

/**
 * Gives the page a desktop bridge with a stand-in server, as the desktop app's preload does.
 * @param settings What the server's settings read.
 * @returns The server's calls, answering what changes nothing, for each test to set and check, and the way to open the
 * dialog as the tray does.
 */
function giveServer(settings: ServerSettings) {
  let trayOpens = () => {}
  const calls = {
    chooseFolder: vi.fn<ServerBridge['chooseFolder']>(async () => null),
    chooseSqliteFile: vi.fn<ServerBridge['chooseSqliteFile']>(async () => null),
    checkImport: vi.fn<ServerBridge['checkImport']>(async () => ({ ok: true })),
    importServer: vi.fn<ServerBridge['importServer']>(async () => ({ ok: false, message: 'Nada importado.' })),
    migrateImport: vi.fn<ServerBridge['migrateImport']>(async () => ({ ok: true })),
    settings: vi.fn<ServerBridge['settings']>(async () => settings),
    usePostgresql: vi.fn<ServerBridge['usePostgresql']>(async () => ({ ok: true })),
    useSqlite: vi.fn<ServerBridge['useSqlite']>(async () => ({ ok: true })),
  }
  window.apcDesktop = {
    notify: () => {},
    onOpenNotifications: () => () => {},
    onUpdateReady: () => () => {},
    restartToUpdate: () => {},
    server: {
      ...calls,
      onOpen: (listener) => {
        trayOpens = listener
        return () => {}
      },
    },
  }
  return { calls, openFromTray: () => trayOpens() }
}

/**
 * Renders the provider over a button that opens the dialog, as the user menu's item does.
 * @param reload Called when the app would open again after a change.
 * @returns The rendered screen.
 */
async function renderSettings(reload = () => {}) {
  const screen = await render(
    <ServerSettingsProvider reload={reload}>
      <Opener />
    </ServerSettingsProvider>,
  )
  return screen
}

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_WINDOW_HEIGHT)
})

afterEach(() => {
  delete window.apcDesktop
})

// In a browser there is no desktop bridge: the provider draws only what it holds, and opening does nothing.
test('Web: in a browser the Servidor dialog is never drawn', async () => {
  const screen = await renderSettings()
  await screen.getByRole('button', { name: 'Abrir as configurações' }).click()
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
})

// Opens the dialog, as the user menu does, and checks it shows the database in use with its folder, the photos'
// folder, the port and the phone's address, and offers no switch while SQLite stays picked.
test('Web: the Servidor dialog shows the database in use, the port and the phone address', async () => {
  giveServer(ON_SQLITE)
  const screen = await renderSettings()
  await screen.getByRole('button', { name: 'Abrir as configurações' }).click()
  const dialog = screen.getByRole('dialog', { name: 'Servidor e banco de dados' })
  await expect.element(dialog.getByText('SQLite, em C:\\Users\\ana\\AppData\\Roaming\\APC Universal Repair\\data')).toBeVisible()
  await expect.element(dialog.getByText('3333')).toBeVisible()
  await expect.element(dialog.getByText('http://192.168.0.10:3333')).toBeVisible()
  await expect.element(dialog.getByRole('button', { name: 'Usar PostgreSQL' })).not.toBeInTheDocument()
  await expect.element(dialog.getByRole('button', { name: 'Fechar' }).first()).toBeVisible()
})

// Opens the dialog from the tray, picks PostgreSQL and gives an address that doesn't connect, and checks the dialog
// says so, as an alert, with SQLite still in use; closing it doesn't open the app again, as nothing changed.
test('Web: a PostgreSQL address that does not connect says so and keeps SQLite', async () => {
  const message = 'Não foi possível conectar ao PostgreSQL: connect ECONNREFUSED 127.0.0.1:1'
  const { calls, openFromTray } = giveServer(ON_SQLITE)
  calls.usePostgresql.mockResolvedValue({ ok: false, message })
  const reload = vi.fn()
  const screen = await renderSettings(reload)
  openFromTray()
  const dialog = screen.getByRole('dialog', { name: 'Servidor e banco de dados' })
  await dialog.getByRole('radio', { name: 'PostgreSQL' }).first().click()
  await dialog.getByLabelText('Endereço do PostgreSQL').fill('postgresql://apc:segredo@127.0.0.1:1/apc')
  await dialog.getByRole('button', { name: 'Usar PostgreSQL' }).click()
  await expect.element(dialog.getByRole('alert')).toHaveTextContent(message)
  expect(calls.usePostgresql).toHaveBeenCalledWith('postgresql://apc:segredo@127.0.0.1:1/apc')
  await expect.element(dialog.getByText(/^SQLite, em /)).toBeVisible()
  await dialog.getByRole('button', { name: 'Fechar' }).first().click()
  expect(reload).not.toHaveBeenCalled()
})

// Moves the server to PostgreSQL, and checks the dialog says it's done, shows the new database, and closing it
// opens the app again on it.
test('Web: moving to PostgreSQL says so and opens the app again on closing', async () => {
  const { calls } = giveServer(ON_SQLITE)
  calls.usePostgresql.mockImplementation(async () => {
    calls.settings.mockResolvedValue({ ...ON_SQLITE, database: 'postgresql', location: 'localhost:5432/apc' })
    return { ok: true }
  })
  const reload = vi.fn()
  const screen = await renderSettings(reload)
  await screen.getByRole('button', { name: 'Abrir as configurações' }).click()
  const dialog = screen.getByRole('dialog', { name: 'Servidor e banco de dados' })
  await dialog.getByRole('radio', { name: 'PostgreSQL' }).first().click()
  await dialog.getByLabelText('Endereço do PostgreSQL').fill('postgresql://apc:segredo@localhost:5432/apc')
  await dialog.getByRole('button', { name: 'Usar PostgreSQL' }).click()
  await expect.element(dialog.getByRole('status')).toHaveTextContent('Pronto: o servidor ligou no PostgreSQL.')
  await expect.element(dialog.getByText('PostgreSQL, em localhost:5432/apc')).toBeVisible()
  await dialog.getByRole('button', { name: 'Fechar' }).first().click()
  expect(reload).toHaveBeenCalledOnce()
})

// Starts with PostgreSQL chosen at install and no address: the dialog opens by itself, can't be closed with Escape,
// and "Usar SQLite" moves the server there and goes on to the app.
test('Web: with PostgreSQL chosen at install and no address, the dialog asks for it first', async () => {
  const { calls } = giveServer({ ...ON_SQLITE, database: 'postgresql', location: '', needsAddress: true })
  calls.useSqlite.mockImplementation(async () => {
    calls.settings.mockResolvedValue(ON_SQLITE)
    return { ok: true }
  })
  const reload = vi.fn()
  const screen = await renderSettings(reload)
  const dialog = screen.getByRole('dialog', { name: 'Banco de dados do servidor' })
  await expect.element(dialog).toBeVisible()
  await expect.element(dialog.getByRole('button', { name: 'Usar PostgreSQL' })).toBeDisabled()
  await userEvent.keyboard('{Escape}')
  await expect.element(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Usar SQLite' }).click()
  expect(calls.useSqlite).toHaveBeenCalledOnce()
  await expect.poll(() => reload.mock.calls.length).toBe(1)
})

// Picks an old clone's SQLite file, which brings its photos folder, imports it, and checks each table's rows and the
// photo files show, the import got the file and the folder, and closing opens the app again.
test('Web: an old server imports from its SQLite file, with its photos, listing what was copied', async () => {
  const file = 'C:\\APC\\apps\\api\\data\\apc.db'
  const photos = 'C:\\APC\\apps\\api\\uploads\\photos'
  const { calls } = giveServer(ON_SQLITE)
  calls.chooseSqliteFile.mockResolvedValue({ file, photos })
  calls.importServer.mockResolvedValue({
    ok: true,
    tables: { user: { source: 2, target: 2 }, item: { source: 120, target: 120 } },
    photos: { copied: 48, missing: 2 },
  })
  const reload = vi.fn()
  const screen = await renderSettings(reload)
  await screen.getByRole('button', { name: 'Abrir as configurações' }).click()
  const dialog = screen.getByRole('dialog', { name: 'Servidor e banco de dados' })
  await expect.element(dialog.getByRole('button', { name: 'Importar', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Escolher o arquivo' }).click()
  await expect.element(dialog.getByText(file)).toBeVisible()
  await expect.element(dialog.getByText(photos)).toBeVisible()
  await dialog.getByRole('button', { name: 'Importar', exact: true }).click()
  const rows = dialog.getByRole('list', { name: 'Linhas copiadas' })
  await expect.element(rows.getByText('Usuários: 2 de 2')).toBeVisible()
  await expect.element(rows.getByText('Itens: 120 de 120')).toBeVisible()
  await expect.element(rows.getByText('Arquivos de fotos: 48 arquivos copiados, 2 não encontrados')).toBeVisible()
  expect(calls.importServer).toHaveBeenCalledWith({ kind: 'sqlite', file }, photos)
  await dialog.getByRole('button', { name: 'Fechar' }).first().click()
  expect(reload).toHaveBeenCalledOnce()
})

// Imports an old PostgreSQL of an earlier version: the dialog says why it can't yet and offers to update it, which
// migrates the old database and then imports it.
test('Web: an old database of an earlier version is updated first, once the user agrees', async () => {
  const source = { kind: 'postgresql', url: 'postgresql://postgres:segredo@localhost:5432/apc_universal_repair' } as const
  const behind = { ok: false, problem: 'sourceBehind', message: 'O banco antigo é de uma versão anterior do APC.' } as const
  const { calls } = giveServer(ON_SQLITE)
  calls.checkImport.mockResolvedValueOnce(behind)
  const screen = await renderSettings()
  await screen.getByRole('button', { name: 'Abrir as configurações' }).click()
  const dialog = screen.getByRole('dialog', { name: 'Servidor e banco de dados' })
  await dialog.getByRole('radio', { name: 'PostgreSQL' }).last().click()
  await dialog.getByLabelText('Endereço do PostgreSQL antigo').fill(source.url)
  await dialog.getByRole('button', { name: 'Importar', exact: true }).click()
  await expect.element(dialog.getByRole('alert')).toHaveTextContent(behind.message)
  expect(calls.migrateImport).not.toHaveBeenCalled()
  await dialog.getByRole('button', { name: 'Atualizar o banco antigo e importar' }).click()
  await expect.poll(() => calls.importServer.mock.calls.length).toBe(1)
  expect(calls.migrateImport).toHaveBeenCalledWith(source)
  expect(calls.importServer).toHaveBeenCalledWith(source, undefined)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Fails a switch in one style and mode and checks the message takes the danger color.
    test(`Web: the Servidor dialog follows the ${style}/${mode} theme`, async () => {
      root.dataset.style = style
      root.dataset.mode = mode
      giveServer(ON_SQLITE).calls.usePostgresql.mockResolvedValue({ ok: false, message: 'Não conectou.' })
      const screen = await renderSettings()
      await screen.getByRole('button', { name: 'Abrir as configurações' }).click()
      const dialog = screen.getByRole('dialog', { name: 'Servidor e banco de dados' })
      await dialog.getByRole('radio', { name: 'PostgreSQL' }).first().click()
      await dialog.getByLabelText('Endereço do PostgreSQL').fill('postgresql://localhost/apc')
      await dialog.getByRole('button', { name: 'Usar PostgreSQL' }).click()
      const alert = dialog.getByRole('alert')
      await expect.element(alert).toBeVisible()
      expect(getComputedStyle(alert.element()).color).toBe(rgb(themes[style][mode].colors.danger))
    })
  }
}

function Opener() {
  const open = useOpenServerSettings()
  return <button onClick={open}>Abrir as configurações</button>
}
