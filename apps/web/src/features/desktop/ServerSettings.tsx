import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { COMMON_TEXTS, DASHBOARD_TEXTS } from '@apc/domain/app-texts'
import { perLocale, type Locale } from '@apc/domain/locale'
import { useLocale, useMessages } from '../../app/useLocale.ts'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Segmented } from '../../components/Segmented'
import { Switch } from '../../components/Switch'
import { TextField } from '../../components/TextField'
import { Heading, Text } from '../../components/Typography'
import { desktopBridge, type ImportOutcome, type ImportSource, type ServerSettings } from './desktopBridge.ts'
import { DESKTOP_TEXTS } from './desktopTexts.ts'
import { PairingCode } from './PairingCode.tsx'
import { serverSettings as serverSettingsRecipe } from './ServerSettings.styles.ts'
import { EntryScreenContext, ServerSettingsContext, type ServerSettingsFocus } from './serverSettingsContext.ts'

// The desktop app's Servidor dialog, over any screen, opened from the user menu or the tray's "Servidor e banco de
// dados…": the database the server runs on, SQLite with its folder or PostgreSQL with its server, its port and, while
// the phone's access is on, the address the phone reaches it at. "Acesso pelo celular" puts the server on the network
// for the phone, over HTTPS, or keeps it answering this computer only, as it starts; Windows may ask about its
// firewall then, and the dialog says to allow private networks only. While it is on, the dialog shows the QR code the
// phone pairs with, and its address and code to type in (see PairingCode.tsx). While it is on, the dialog warns when the network is set to Public or
// a firewall rule lets the app in on public networks, checked each time it opens or the access turns on. "Banco de
// dados" moves it to PostgreSQL, at an address the app checks, migrates and keeps sealed, or back to SQLite; switching
// doesn't move the data, which "Importar dados de outro servidor" brings from an old server's PostgreSQL or SQLite
// file, with its photos, into the database in use while it is empty. An old database of an earlier version is updated
// first, once the user agrees. After a change, closing the dialog opens the app again on the new data. "Porta do
// servidor" moves the server to another port, from 1024 to 65535, once the user confirms, saying the phone's address
// changes with it while the phone's access is on; the app checks the port is free first, and the window follows the
// server there. Opened from the screen that says the port is taken, the dialog starts on that field. While the database
// in use is empty, the app's start offers, once the recovery copy is dealt with, to import an old server before anyone
// signs up: "Importar de um servidor antigo" opens the dialog on its import, and "Começar do zero" stops the offer for
// good; it shows again on the next start otherwise, until the database holds data. On SQLite, "Chave do banco" changes
// the file's key once the user confirms what that means: the old recovery copy, and the copies made before updates,
// stop opening the file; the new key's recovery copy then shows at once, until it is kept. When PostgreSQL was chosen
// at install with no address yet, the dialog opens by itself and stays until the server has a database. The SQLite file
// is encrypted, and while its key's recovery copy isn't kept the app shows it on opening, until the user says it is; an
// encrypted file of another install imports with its recovery copy. With a server the app doesn't run, it only says
// where the server is. In a browser there is no bridge, and nothing is drawn.

/** The databases offered. */
const DATABASES = [
  { value: 'sqlite', label: 'SQLite' },
  { value: 'postgresql', label: 'PostgreSQL' },
]
/** The old servers offered. */
const SOURCES = perLocale((locale) => [
  { value: 'sqlite', label: DESKTOP_TEXTS[locale].server.sqliteFile },
  { value: 'postgresql', label: 'PostgreSQL' },
])

/** A message under a section: what went wrong, or what was done. */
type Note = { tone: 'danger' | 'done'; text: string }

/**
 * Words the phone's address.
 * @param settings The server's settings.
 * @param locale The language.
 * @returns e.g. "http://192.168.0.10:3000", or that there is no network.
 */
function phoneLine(settings: Extract<ServerSettings, { kind: 'own' }>, locale: Locale): string {
  return settings.phoneAddress ? `https://${settings.phoneAddress}:${settings.port}` : DESKTOP_TEXTS[locale].server.noNetwork
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
  // The SQLite key's recovery copy, shown on opening while it isn't kept.
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null)
  // Whether this start offers to import an old server, while the database in use is empty, and whether a screen it
  // shows over, the login or the sign-up, is on: an answer that comes after a sign-up shows nothing.
  const [firstStart, setFirstStart] = useState(false)
  const [onEntryScreen, setOnEntryScreen] = useState(false)
  // The field the dialog opens on, when asked.
  const [focus, setFocus] = useState<ServerSettingsFocus>()

  /** Reads the settings again, as after a change. */
  const load = async () => {
    const read = await server?.settings()
    setSettings(read)
    return read
  }

  // Read the settings on start, opening the dialog when PostgreSQL's address is missing, or showing the key's recovery
  // copy while it isn't kept and offering to import an old server into an empty database, and hear the tray.
  useEffect(() => {
    if (!server) {
      return
    }
    void server.settings().then((read) => {
      setSettings(read)
      if (read.kind === 'own' && read.needsAddress) {
        setOpen(true)
      } else if (read.kind === 'own') {
        if (read.recoveryKeyPending) {
          void server.recoveryKey().then(setRecoveryKey)
        }
        void server.firstStart().then(setFirstStart)
      }
    })
    return server.onOpen(() => {
      setOpen(true)
      setFocus(undefined)
      setOpenings((count) => count + 1)
      void server.settings().then(setSettings)
    })
  }, [server])

  /**
   * Opens the dialog with the settings read again.
   * @param on The field to start on; anything else, such as a click's event, starts at the top.
   */
  const show = (on?: ServerSettingsFocus) => {
    setOpen(true)
    setFocus(on === 'import' || on === 'port' ? on : undefined)
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
      <EntryScreenContext.Provider value={setOnEntryScreen}>{children}</EntryScreenContext.Provider>
      {server && (
        <ServerSettingsDialog
          key={openings}
          open={open}
          focus={focus}
          settings={settings}
          onClose={close}
          onKeyChanged={() => void server.recoveryKey().then(setRecoveryKey)}
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
      {server && firstStart && onEntryScreen && !recoveryKey && !open && (
        <FirstStartDialog
          onImport={() => {
            setFirstStart(false)
            show('import')
          }}
          onLater={() => setFirstStart(false)}
          onScratch={async () => {
            await server.startFromScratch()
            setFirstStart(false)
          }}
        />
      )}
      {server && recoveryKey && (
        <RecoveryKeyDialog
          recoveryKey={recoveryKey}
          onLater={() => setRecoveryKey(null)}
          onSaved={async () => {
            await server.recoveryKeySaved()
            setRecoveryKey(null)
          }}
        />
      )}
    </ServerSettingsContext.Provider>
  )
}

type FirstStartDialogProps = {
  /** Opens the Servidor dialog on its import. */
  onImport: () => void
  /** Closes it for now, to offer it again on the next start. */
  onLater: () => void
  /** Says the user starts from scratch, which stops the offer. */
  onScratch: () => Promise<void>
}

function FirstStartDialog({ onImport, onLater, onScratch }: FirstStartDialogProps) {
  const texts = useMessages(DESKTOP_TEXTS).server.firstStart
  return (
    <Dialog
      open
      onClose={onLater}
      title={texts.title}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={() => void onScratch()}>
            {texts.scratch}
          </Button>
          <Button size="sm" onClick={onImport}>
            {texts.import}
          </Button>
        </>
      }
    >
      <Text size="sm" tone="muted">
        {texts.text}
      </Text>
    </Dialog>
  )
}

type RecoveryKeyDialogProps = {
  recoveryKey: string
  /** Closes it, to show it again on the next opening. */
  onLater: () => void
  /** Says it is kept, which stops it showing. */
  onSaved: () => Promise<void>
}

function RecoveryKeyDialog({ recoveryKey, onLater, onSaved }: RecoveryKeyDialogProps) {
  const { classes, ids } = serverSettingsRecipe()
  const { later, recovery: texts } = useMessages(DESKTOP_TEXTS).server
  return (
    <Dialog
      open
      onClose={onLater}
      title={texts.title}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onLater}>
            {later}
          </Button>
          <Button size="sm" onClick={() => void onSaved()}>
            {texts.saved}
          </Button>
        </>
      }
    >
      <Text size="sm" tone="muted">
        {texts.text}
      </Text>
      <p aria-label={texts.key} className={classes.recoveryKey()} data-testid={ids.recoveryKey}>
        {recoveryKey}
      </p>
      <Text size="sm" tone="muted">
        {texts.keep}
      </Text>
    </Dialog>
  )
}

type ServerSettingsDialogProps = {
  open: boolean
  /** The field to start on, past the one the dialog focuses first. */
  focus?: ServerSettingsFocus
  settings: ServerSettings | undefined
  onClose: () => void
  /** Called after the database changed or an import copied, so the settings are read again. */
  onChanged: () => Promise<void>
  /** Called after the SQLite key changed, so its new recovery copy shows. */
  onKeyChanged: () => void
}

function ServerSettingsDialog({ open, focus, settings, onClose, onChanged, onKeyChanged }: ServerSettingsDialogProps) {
  const server = desktopBridge()!.server!
  const { classes, ids } = serverSettingsRecipe()
  const { locale } = useLocale()
  const texts = DESKTOP_TEXTS[locale].server
  const common = COMMON_TEXTS[locale]
  const databaseHeading = useId()
  const importHeading = useId()
  const portHeading = useId()
  const keyHeading = useId()
  const phoneHeading = useId()
  const portField = useRef<HTMLInputElement>(null)
  const importSection = useRef<HTMLElement>(null)
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
  const [sourceKey, setSourceKey] = useState('')
  const [photosFrom, setPhotosFrom] = useState<string>()
  const [importing, setImporting] = useState(false)
  const [importNote, setImportNote] = useState<Note>()
  const [behind, setBehind] = useState(false)
  const [result, setResult] = useState<Extract<ImportOutcome, { ok: true }>>()
  // The port typed, the one in use until another is; whether the user is asked to confirm the phone's new address.
  const [typedPort, setTypedPort] = useState<string>()
  const port = typedPort ?? String(own?.port ?? '')
  const [confirming, setConfirming] = useState(false)
  const [movingPort, setMovingPort] = useState(false)
  const [portNote, setPortNote] = useState<Note>()
  // Whether the user is asked to confirm a new SQLite key, and how changing it went.
  const [confirmingKey, setConfirmingKey] = useState(false)
  const [changingKey, setChangingKey] = useState(false)
  const [keyNote, setKeyNote] = useState<Note>()
  // Whether the phone's access is changing, and how it went.
  const [changingAccess, setChangingAccess] = useState(false)
  const [accessNote, setAccessNote] = useState<Note>()
  // What leaves the server public while the phone's access is on, read each time it opens or the access turns on.
  const [networkWarnings, setNetworkWarnings] = useState<string[]>([])
  const phoneAccess = own?.phoneAccess === true

  // Start on the port field or the import when asked, once the Dialog has focused its first control.
  useEffect(() => {
    if (open && focus === 'port' && own) {
      const frame = requestAnimationFrame(() => {
        portField.current?.scrollIntoView({ block: 'center' })
        portField.current?.focus()
      })
      return () => cancelAnimationFrame(frame)
    }
    if (open && focus === 'import' && own) {
      const frame = requestAnimationFrame(() => importSection.current?.scrollIntoView({ block: 'start' }))
      return () => cancelAnimationFrame(frame)
    }
  }, [open, focus, own])

  // Ask what leaves the server public each time the dialog opens, or the phone's access turns on.
  useEffect(() => {
    if (open && phoneAccess) {
      void server.networkWarnings().then(setNetworkWarnings)
    }
  }, [open, phoneAccess, server])

  const source: ImportSource | undefined =
    sourceKind === 'sqlite'
      ? sourceFile
        ? { kind: 'sqlite', file: sourceFile, ...(sourceKey.trim() ? { key: sourceKey.trim() } : {}) }
        : undefined
      : sourceUrl.trim()
        ? { kind: 'postgresql', url: sourceUrl.trim() }
        : undefined

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
    setSwitchNote({ tone: 'done', text: to === 'postgresql' ? texts.done.postgresql : texts.done.sqlite })
    await onChanged()
  }

  /** Moves the server to the port typed, once the user confirmed the phone's new address, then says how it went. */
  const movePort = async () => {
    setMovingPort(true)
    setPortNote(undefined)
    const outcome = await server.usePort(Number(port))
    setMovingPort(false)
    setConfirming(false)
    if (!outcome.ok) {
      setPortNote({ tone: 'danger', text: outcome.message })
      return
    }
    setTypedPort(undefined)
    setPortNote({ tone: 'done', text: texts.done.port(port) })
    await onChanged()
  }

  /** Turns the phone's access on or off, which restarts the server, then says how it went. */
  const switchPhoneAccess = async (on: boolean) => {
    setChangingAccess(true)
    setAccessNote(undefined)
    const outcome = await server.usePhoneAccess(on)
    setChangingAccess(false)
    if (!outcome.ok) {
      setAccessNote({ tone: 'danger', text: outcome.message })
      return
    }
    setAccessNote({ tone: 'done', text: on ? texts.done.phoneOn : texts.done.phoneOff })
    await onChanged()
  }

  /** Changes the SQLite key, once the user confirmed what it means, then shows the new recovery copy or says why not. */
  const changeKey = async () => {
    setChangingKey(true)
    setKeyNote(undefined)
    const outcome = await server.changeKey()
    setChangingKey(false)
    setConfirmingKey(false)
    if (!outcome.ok) {
      setKeyNote({ tone: 'danger', text: outcome.message })
      return
    }
    setKeyNote({ tone: 'done', text: texts.done.key })
    onKeyChanged()
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
    setImportNote({ tone: 'done', text: texts.done.imported })
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
        title={texts.setupTitle}
        actions={
          <>
            <Button variant="secondary" size="sm" disabled={switching} onClick={() => void switchDatabase('sqlite')}>
              {texts.useSqlite}
            </Button>
            <Button size="sm" loading={switching} disabled={!address.trim()} onClick={() => void switchDatabase('postgresql')}>
              {texts.usePostgresql}
            </Button>
          </>
        }
      >
        <Text size="sm" tone="muted">
          {texts.needsAddress}
        </Text>
        <TextField
          label={texts.postgresql}
          kind="password"
          value={address}
          onValueChange={setAddress}
          helper={texts.addressHint}
        />
        {note(switchNote)}
      </Dialog>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={DASHBOARD_TEXTS[locale].serverSettings}
      closable
      actions={
        <Button variant="secondary" size="sm" onClick={onClose}>
          {common.close}
        </Button>
      }
    >
      {settings?.kind === 'elsewhere' && (
        <Text size="sm" tone="muted">
          {texts.elsewhere(settings.address)}
        </Text>
      )}
      {settings?.kind === 'portTaken' && (
        <Text size="sm" tone="muted">
          {texts.portTaken(settings.port)}
        </Text>
      )}
      {own && (
        <>
          <dl className={classes.facts()} data-testid={ids.facts}>
            <dt className={classes.term()} data-testid={ids.term}>
              {texts.databaseInUse}
            </dt>
            <dd className={classes.value()} data-testid={ids.value}>
              {own.database === 'sqlite' ? texts.sqliteAt(own.location) : texts.postgresqlAt(own.location)}
            </dd>
            <dt className={classes.term()} data-testid={ids.term}>
              {texts.photos}
            </dt>
            <dd className={classes.value()} data-testid={ids.value}>
              {own.photos}
            </dd>
            <dt className={classes.term()} data-testid={ids.term}>
              {texts.port}
            </dt>
            <dd className={classes.value()} data-testid={ids.value}>
              {own.port}
            </dd>
            <dt className={classes.term()} data-testid={ids.term}>
              {texts.phone.address}
            </dt>
            <dd className={classes.value()} data-testid={ids.value}>
              {own.phoneAccess ? phoneLine(own, locale) : texts.phone.off}
            </dd>
          </dl>
          <section aria-labelledby={databaseHeading} className={classes.section()} data-testid={ids.section}>
            <Heading id={databaseHeading} level={4}>
              {texts.database}
            </Heading>
            <Segmented label={texts.database} options={DATABASES} value={database} onValueChange={setPicked} />
            {database === 'postgresql' && (
              <TextField
                label={texts.postgresql}
                kind="password"
                value={address}
                onValueChange={setAddress}
                helper={texts.addressHint}
              />
            )}
            <Text size="sm" tone="muted">
              {texts.databaseHint}
            </Text>
            <div className={classes.buttons()} data-testid={ids.buttons}>
              {database === 'postgresql' && (
                <Button size="sm" loading={switching} disabled={!address.trim()} onClick={() => void switchDatabase('postgresql')}>
                  {texts.usePostgresql}
                </Button>
              )}
              {database === 'sqlite' && own.database === 'postgresql' && (
                <Button size="sm" loading={switching} onClick={() => void switchDatabase('sqlite')}>
                  {texts.backToSqlite}
                </Button>
              )}
            </div>
            {note(switchNote)}
          </section>
          {own.database === 'sqlite' && (
            <section aria-labelledby={keyHeading} className={classes.section()} data-testid={ids.section}>
              <Heading id={keyHeading} level={4}>
                {texts.key.title}
              </Heading>
              <Text size="sm" tone="muted">
                {texts.key.hint}
              </Text>
              {confirmingKey && (
                <ul aria-label={texts.key.changes} className={classes.results()} data-testid={ids.results}>
                  <li className={classes.result()} data-testid={ids.result}>
                    {texts.key.newKey}
                  </li>
                  <li className={classes.result()} data-testid={ids.result}>
                    {texts.key.oldCopy}
                  </li>
                  <li className={classes.result()} data-testid={ids.result}>
                    {texts.key.oldBackups}
                  </li>
                </ul>
              )}
              <div className={classes.buttons()} data-testid={ids.buttons}>
                {confirmingKey ? (
                  <>
                    <Button size="sm" loading={changingKey} onClick={() => void changeKey()}>
                      {texts.changeKeyAnyway}
                    </Button>
                    <Button variant="secondary" size="sm" disabled={changingKey} onClick={() => setConfirmingKey(false)}>
                      {common.cancel}
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setConfirmingKey(true)}>
                    {texts.changeKey}
                  </Button>
                )}
              </div>
              {note(keyNote)}
            </section>
          )}
          <section aria-labelledby={phoneHeading} className={classes.section()} data-testid={ids.section}>
            <Heading id={phoneHeading} level={4}>
              {texts.phone.title}
            </Heading>
            <Switch checked={own.phoneAccess} onCheckedChange={(on) => void switchPhoneAccess(on)} disabled={changingAccess}>
              {texts.phone.allow}
            </Switch>
            <Text size="sm" tone="muted">
              {own.phoneAccess
                ? texts.phone.onHint(phoneLine(own, locale))
                : texts.phone.offHint}
            </Text>
            {own.phoneAccess && own.pairing && (
              <>
                <Text size="sm" tone="muted">
                  {texts.phone.pairingHint}
                </Text>
                <PairingCode pairing={own.pairing} />
              </>
            )}
            {own.phoneAccess &&
              networkWarnings.map((warning) => (
                <p key={warning} role="alert" className={classes.note({ tone: 'warn' })} data-testid={ids.note}>
                  {warning}
                </p>
              ))}
            {note(accessNote)}
          </section>
          <section aria-labelledby={portHeading} className={classes.section()} data-testid={ids.section}>
            <Heading id={portHeading} level={4}>
              {texts.portTitle}
            </Heading>
            <TextField
              ref={portField}
              label={texts.port}
              kind="number"
              value={port}
              onValueChange={(typed) => {
                setTypedPort(typed.replace(/\D/g, '').slice(0, 5))
                setConfirming(false)
                setPortNote(undefined)
              }}
              helper={texts.portHint}
            />
            {confirming && own.phoneAccess && own.phoneAddress && (
              <Text size="sm" tone="muted">
                {texts.portMoves(`https://${own.phoneAddress}:${port}`)}
              </Text>
            )}
            {confirming && own.phoneAccess && !own.phoneAddress && (
              <Text size="sm" tone="muted">
                {texts.portMovesTo(port)}
              </Text>
            )}
            <div className={classes.buttons()} data-testid={ids.buttons}>
              {confirming ? (
                <>
                  <Button size="sm" loading={movingPort} onClick={() => void movePort()}>
                    {texts.changePortAnyway}
                  </Button>
                  <Button variant="secondary" size="sm" disabled={movingPort} onClick={() => setConfirming(false)}>
                    {common.cancel}
                  </Button>
                </>
              ) : (
                <Button size="sm" disabled={!port || Number(port) === own.port} onClick={() => setConfirming(true)}>
                  {texts.changePort}
                </Button>
              )}
            </div>
            {note(portNote)}
          </section>
          <section ref={importSection} aria-labelledby={importHeading} className={classes.section()} data-testid={ids.section}>
            <Heading id={importHeading} level={4}>
              {texts.importTitle}
            </Heading>
            <Text size="sm" tone="muted">
              {texts.importHint}
            </Text>
            <Segmented
              label={texts.oldServer}
              options={SOURCES[locale]}
              value={sourceKind}
              onValueChange={(kind) => {
                setSourceKind(kind)
                setBehind(false)
                setImportNote(undefined)
              }}
            />
            {sourceKind === 'sqlite' && (
              <div className={classes.pick()} data-testid={ids.pick}>
                <Button variant="secondary" size="sm" onClick={() => void chooseFile()}>
                  {sourceFile ? texts.chooseOtherFile : texts.chooseFile}
                </Button>
                <Text size="sm" tone="muted">
                  {sourceFile ?? texts.cloneFile}
                </Text>
              </div>
            )}
            {sourceKind === 'sqlite' && sourceFile && (
              <TextField
                label={texts.sourceKey}
                kind="password"
                value={sourceKey}
                onValueChange={(key) => {
                  setSourceKey(key)
                  setBehind(false)
                }}
                helper={texts.sourceKeyHint}
              />
            )}
            {sourceKind === 'postgresql' && (
              <TextField
                label={texts.oldPostgresql}
                kind="password"
                value={sourceUrl}
                onValueChange={(url) => {
                  setSourceUrl(url)
                  setBehind(false)
                }}
                helper={texts.addressHint}
              />
            )}
            <div className={classes.pick()} data-testid={ids.pick}>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => setPhotosFrom((await server.chooseFolder(photosFrom)) ?? photosFrom)}
              >
                {texts.choosePhotos}
              </Button>
              <Text size="sm" tone="muted">
                {photosFrom ?? texts.clonePhotos}
              </Text>
            </div>
            <div className={classes.buttons()} data-testid={ids.buttons}>
              {behind ? (
                <Button size="sm" loading={importing} onClick={() => void runImport(true)}>
                  {texts.updateAndImport}
                </Button>
              ) : (
                <Button size="sm" loading={importing} disabled={!source} onClick={() => void runImport(false)}>
                  {texts.import}
                </Button>
              )}
            </div>
            {note(importNote)}
            {result && (
              <ul aria-label={texts.copied} className={classes.results()} data-testid={ids.results}>
                {Object.entries(result.tables).map(([table, count]) => (
                  <li key={table} className={classes.result()} data-testid={ids.result}>
                    {texts.tableCount(texts.tables[table] ?? table, count.target, count.source)}
                  </li>
                ))}
                <li className={classes.result()} data-testid={ids.result}>
                  {texts.photoFiles(result.photos.copied, result.photos.missing)}
                </li>
              </ul>
            )}
          </section>
        </>
      )}
    </Dialog>
  )
}
