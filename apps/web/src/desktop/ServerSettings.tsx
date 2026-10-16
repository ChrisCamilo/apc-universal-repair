import { useEffect, useId, useState, type ReactNode } from 'react'
import { Button } from '../components/Button.tsx'
import { Dialog } from '../components/Dialog.tsx'
import { Segmented } from '../components/Segmented.tsx'
import { TextField } from '../components/TextField.tsx'
import { Heading, Text } from '../components/Typography.tsx'
import { desktopBridge, type ImportOutcome, type ImportSource, type ServerSettings } from './desktopBridge.ts'
import { serverSettings as serverSettingsRecipe } from './ServerSettings.styles.ts'
import { ServerSettingsContext } from './serverSettingsContext.ts'

// The desktop app's Servidor dialog, over any screen, opened from the user menu or the tray's "Servidor e banco de
// dados…": the database the server runs on, SQLite with its folder or PostgreSQL with its server, its port and the
// address the phone reaches it at. "Banco de dados" moves it to PostgreSQL, at an address the app checks, migrates and
// keeps sealed, or back to SQLite; switching doesn't move the data, which "Importar dados de outro servidor" brings
// from an old server's PostgreSQL or SQLite file, with its photos, into the database in use while it is empty. An old
// database of an earlier version is updated first, once the user agrees. After a change, closing the dialog opens the
// app again on the new data. When PostgreSQL was chosen at install with no address yet, the dialog opens by itself and
// stays until the server has a database. With a server the app doesn't run, it only says where the server is. In a
// browser there is no bridge, and nothing is drawn.

/** The databases offered. */
const DATABASES = [
  { value: 'sqlite', label: 'SQLite' },
  { value: 'postgresql', label: 'PostgreSQL' },
]
/** The old servers offered. */
const SOURCES = [
  { value: 'sqlite', label: 'Arquivo SQLite' },
  { value: 'postgresql', label: 'PostgreSQL' },
]
/** Each table an import copies, by its server name, as the result lists it. */
const TABLE_LABELS: Record<string, string> = {
  user: 'Usuários',
  category: 'Categorias',
  partBrand: 'Marcas de peça',
  brand: 'Marcas de veículo',
  vehicleModel: 'Modelos de veículo',
  item: 'Itens',
  itemPhoto: 'Fotos dos itens',
}

/** A message under a section: what went wrong, or what was done. */
type Note = { tone: 'danger' | 'done'; text: string }

/**
 * Words the phone's address.
 * @param settings The server's settings.
 * @returns e.g. "http://192.168.0.10:3333", or that there is no network.
 */
function phoneLine(settings: Extract<ServerSettings, { kind: 'own' }>): string {
  return settings.phoneAddress ? `http://${settings.phoneAddress}:${settings.port}` : 'Sem rede para o celular'
}

/**
 * Words how many photo files an import copied.
 * @param photos The files copied and not found.
 * @returns e.g. "Fotos: 24 arquivos copiados, 2 não encontrados".
 */
function photosLine(photos: { copied: number; missing: number }): string {
  const copied = photos.copied === 1 ? '1 arquivo copiado' : `${photos.copied} arquivos copiados`
  const missing = photos.missing === 0 ? '' : photos.missing === 1 ? ', 1 não encontrado' : `, ${photos.missing} não encontrados`
  return `Arquivos de fotos: ${copied}${missing}`
}

type ServerSettingsProviderProps = {
  children: ReactNode
  /** Opens the app again after a change; the default goes to its start. */
  reload?: () => void
}

export function ServerSettingsProvider({ children, reload = () => window.location.assign('/') }: ServerSettingsProviderProps) {
  const server = desktopBridge()?.server
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<ServerSettings>()
  const [changed, setChanged] = useState(false)
  // Each opening starts the dialog afresh, on the database in use and with no import picked.
  const [openings, setOpenings] = useState(0)

  /** Reads the settings again, as after a change. */
  const load = async () => {
    const read = await server?.settings()
    setSettings(read)
    return read
  }

  // Read the settings on start, opening the dialog when PostgreSQL's address is missing, and hear the tray.
  useEffect(() => {
    if (!server) {
      return
    }
    void server.settings().then((read) => {
      setSettings(read)
      if (read.kind === 'own' && read.needsAddress) {
        setOpen(true)
      }
    })
    return server.onOpen(() => {
      setOpen(true)
      setOpenings((count) => count + 1)
      void server.settings().then(setSettings)
    })
  }, [server])

  /** Opens the dialog with the settings read again. */
  const show = () => {
    setOpen(true)
    setOpenings((count) => count + 1)
    void load()
  }

  /** Closes the dialog, opening the app again when something changed. */
  const close = () => {
    setOpen(false)
    if (changed) {
      reload()
    }
  }

  return (
    <ServerSettingsContext.Provider value={show}>
      {children}
      {server && (
        <ServerSettingsDialog
          key={openings}
          open={open}
          settings={settings}
          onClose={close}
          onChanged={async () => {
            const read = await load()
            // The first start goes on to the app once the server has a database.
            if (read?.kind === 'own' && !read.needsAddress && settings?.kind === 'own' && settings.needsAddress) {
              reload()
            } else {
              setChanged(true)
            }
          }}
        />
      )}
    </ServerSettingsContext.Provider>
  )
}

type ServerSettingsDialogProps = {
  open: boolean
  settings: ServerSettings | undefined
  onClose: () => void
  /** Called after the database changed or an import copied, so the settings are read again. */
  onChanged: () => Promise<void>
}

function ServerSettingsDialog({ open, settings, onClose, onChanged }: ServerSettingsDialogProps) {
  const server = desktopBridge()!.server!
  const { classes, ids } = serverSettingsRecipe()
  const databaseHeading = useId()
  const importHeading = useId()
  const own = settings?.kind === 'own' ? settings : undefined
  const setup = own?.needsAddress ?? false
  // The database picked, the one in use until another is.
  const [picked, setPicked] = useState<string>()
  const database = picked ?? own?.database ?? 'sqlite'
  const [address, setAddress] = useState('')
  const [switching, setSwitching] = useState(false)
  const [switchNote, setSwitchNote] = useState<Note>()
  const [sourceKind, setSourceKind] = useState('sqlite')
  const [sourceFile, setSourceFile] = useState<string>()
  const [sourceUrl, setSourceUrl] = useState('')
  const [photosFrom, setPhotosFrom] = useState<string>()
  const [importing, setImporting] = useState(false)
  const [importNote, setImportNote] = useState<Note>()
  const [behind, setBehind] = useState(false)
  const [result, setResult] = useState<Extract<ImportOutcome, { ok: true }>>()
  const source: ImportSource | undefined =
    sourceKind === 'sqlite' ? (sourceFile ? { kind: 'sqlite', file: sourceFile } : undefined) : sourceUrl.trim() ? { kind: 'postgresql', url: sourceUrl.trim() } : undefined

  /** Moves the server to the database picked, then says how it went. */
  const switchDatabase = async (to: 'postgresql' | 'sqlite') => {
    setSwitching(true)
    setSwitchNote(undefined)
    const outcome = to === 'postgresql' ? await server.usePostgresql(address.trim()) : await server.useSqlite()
    setSwitching(false)
    if (!outcome.ok) {
      setSwitchNote({ tone: 'danger', text: outcome.message })
      return
    }
    setAddress('')
    setSwitchNote({ tone: 'done', text: to === 'postgresql' ? 'Pronto: o servidor ligou no PostgreSQL.' : 'Pronto: o servidor voltou ao SQLite.' })
    await onChanged()
  }

  /** Picks the old server's SQLite file, and its clone's photos folder with it. */
  const chooseFile = async () => {
    const chosen = await server.chooseSqliteFile()
    if (chosen) {
      setSourceFile(chosen.file)
      setPhotosFrom(chosen.photos)
      setBehind(false)
      setImportNote(undefined)
    }
  }

  /** Imports the old server, updating its database first when the user agreed to; then says how it went. */
  const runImport = async (update: boolean) => {
    if (!source) {
      return
    }
    setImporting(true)
    setImportNote(undefined)
    setResult(undefined)
    if (update) {
      const migrated = await server.migrateImport(source)
      if (!migrated.ok) {
        setImporting(false)
        setImportNote({ tone: 'danger', text: migrated.message })
        return
      }
      setBehind(false)
    }
    const checked = await server.checkImport(source)
    if (!checked.ok) {
      setImporting(false)
      setBehind('problem' in checked && checked.problem === 'sourceBehind')
      setImportNote({ tone: 'danger', text: checked.message })
      return
    }
    const outcome = await server.importServer(source, photosFrom)
    setImporting(false)
    if (!outcome.ok) {
      setImportNote({ tone: 'danger', text: outcome.message })
      return
    }
    setResult(outcome)
    setImportNote({ tone: 'done', text: 'Pronto: os dados do servidor antigo estão neste servidor.' })
    await onChanged()
  }

  const note = (shown: Note | undefined) =>
    shown && (
      <p role={shown.tone === 'danger' ? 'alert' : 'status'} className={classes.note({ tone: shown.tone })} data-testid={ids.note}>
        {shown.text}
      </p>
    )

  if (setup) {
    return (
      <Dialog
        open={open}
        onClose={() => {}}
        title="Banco de dados do servidor"
        actions={
          <>
            <Button variant="secondary" size="sm" disabled={switching} onClick={() => void switchDatabase('sqlite')}>
              Usar SQLite
            </Button>
            <Button size="sm" loading={switching} disabled={!address.trim()} onClick={() => void switchDatabase('postgresql')}>
              Usar PostgreSQL
            </Button>
          </>
        }
      >
        <Text size="sm" tone="muted">
          Na instalação você escolheu o PostgreSQL. Informe o endereço dele para o servidor ligar, ou use o SQLite, um
          arquivo neste computador.
        </Text>
        <TextField
          label="Endereço do PostgreSQL"
          kind="password"
          value={address}
          onValueChange={setAddress}
          helper="postgresql://usuário:senha@servidor:5432/banco"
        />
        {note(switchNote)}
      </Dialog>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Servidor e banco de dados"
      closable
      actions={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {settings?.kind === 'elsewhere' && (
        <Text size="sm" tone="muted">
          Este app usa o servidor em {settings.address}. O banco de dados dele se configura no computador onde ele roda.
        </Text>
      )}
      {settings?.kind === 'portTaken' && (
        <Text size="sm" tone="muted">
          Outro servidor já respondia na porta {settings.port} quando o app abriu, talvez o de um clone antigo, e o app
          usa ele. Para usar o servidor do app, desligue esse servidor e abra o app de novo.
        </Text>
      )}
      {own && (
        <>
          <dl className={classes.facts()} data-testid={ids.facts}>
            <dt className={classes.term()} data-testid={ids.term}>
              Banco em uso
            </dt>
            <dd className={classes.value()} data-testid={ids.value}>
              {own.database === 'sqlite' ? `SQLite, em ${own.location}` : `PostgreSQL, em ${own.location}`}
            </dd>
            <dt className={classes.term()} data-testid={ids.term}>
              Fotos
            </dt>
            <dd className={classes.value()} data-testid={ids.value}>
              {own.photos}
            </dd>
            <dt className={classes.term()} data-testid={ids.term}>
              Porta
            </dt>
            <dd className={classes.value()} data-testid={ids.value}>
              {own.port}
            </dd>
            <dt className={classes.term()} data-testid={ids.term}>
              Endereço para o celular
            </dt>
            <dd className={classes.value()} data-testid={ids.value}>
              {phoneLine(own)}
            </dd>
          </dl>
          <section aria-labelledby={databaseHeading} className={classes.section()} data-testid={ids.section}>
            <Heading id={databaseHeading} level={4}>
              Banco de dados
            </Heading>
            <Segmented label="Banco de dados" options={DATABASES} value={database} onValueChange={setPicked} />
            {database === 'postgresql' && (
              <TextField
                label="Endereço do PostgreSQL"
                kind="password"
                value={address}
                onValueChange={setAddress}
                helper="postgresql://usuário:senha@servidor:5432/banco"
              />
            )}
            <Text size="sm" tone="muted">
              Trocar de banco não leva os dados junto: para trazê-los, use Importar abaixo.
            </Text>
            <div className={classes.buttons()} data-testid={ids.buttons}>
              {database === 'postgresql' && (
                <Button size="sm" loading={switching} disabled={!address.trim()} onClick={() => void switchDatabase('postgresql')}>
                  Usar PostgreSQL
                </Button>
              )}
              {database === 'sqlite' && own.database === 'postgresql' && (
                <Button size="sm" loading={switching} onClick={() => void switchDatabase('sqlite')}>
                  Voltar ao SQLite
                </Button>
              )}
            </div>
            {note(switchNote)}
          </section>
          <section aria-labelledby={importHeading} className={classes.section()} data-testid={ids.section}>
            <Heading id={importHeading} level={4}>
              Importar dados de outro servidor
            </Heading>
            <Text size="sm" tone="muted">
              Traz os dados e as fotos de um servidor antigo, como o de um clone, para o banco em uso, que precisa estar
              vazio: importe antes de criar contas. O servidor fica desligado durante a cópia.
            </Text>
            <Segmented
              label="Servidor antigo"
              options={SOURCES}
              value={sourceKind}
              onValueChange={(kind) => {
                setSourceKind(kind)
                setBehind(false)
                setImportNote(undefined)
              }}
            />
            {sourceKind === 'sqlite' ? (
              <div className={classes.pick()} data-testid={ids.pick}>
                <Button variant="secondary" size="sm" onClick={() => void chooseFile()}>
                  {sourceFile ? 'Escolher outro arquivo' : 'Escolher o arquivo'}
                </Button>
                <Text size="sm" tone="muted">
                  {sourceFile ?? 'O apc.db em apps\\api\\data do clone'}
                </Text>
              </div>
            ) : (
              <TextField
                label="Endereço do PostgreSQL antigo"
                kind="password"
                value={sourceUrl}
                onValueChange={(url) => {
                  setSourceUrl(url)
                  setBehind(false)
                }}
                helper="postgresql://usuário:senha@servidor:5432/banco"
              />
            )}
            <div className={classes.pick()} data-testid={ids.pick}>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => setPhotosFrom((await server.chooseFolder(photosFrom)) ?? photosFrom)}
              >
                Escolher a pasta das fotos
              </Button>
              <Text size="sm" tone="muted">
                {photosFrom ?? 'A pasta apps\\api\\uploads\\photos do clone'}
              </Text>
            </div>
            <div className={classes.buttons()} data-testid={ids.buttons}>
              {behind ? (
                <Button size="sm" loading={importing} onClick={() => void runImport(true)}>
                  Atualizar o banco antigo e importar
                </Button>
              ) : (
                <Button size="sm" loading={importing} disabled={!source} onClick={() => void runImport(false)}>
                  Importar
                </Button>
              )}
            </div>
            {note(importNote)}
            {result && (
              <ul aria-label="Linhas copiadas" className={classes.results()} data-testid={ids.results}>
                {Object.entries(result.tables).map(([table, count]) => (
                  <li key={table} className={classes.result()} data-testid={ids.result}>
                    {TABLE_LABELS[table] ?? table}: {count.target} de {count.source}
                  </li>
                ))}
                <li className={classes.result()} data-testid={ids.result}>
                  {photosLine(result.photos)}
                </li>
              </ul>
            )}
          </section>
        </>
      )}
    </Dialog>
  )
}
