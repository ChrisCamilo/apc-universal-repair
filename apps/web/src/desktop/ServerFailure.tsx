import { useEffect, useState } from 'react'
import { Button } from '../components/Button.tsx'
import { ErrorState } from '../components/EmptyState.tsx'
import { Spinner } from '../components/Spinner.tsx'
import { TextField } from '../components/TextField.tsx'
import { desktopBridge, type ServerFailure as Failure } from './desktopBridge.ts'
import { serverFailure } from './ServerFailure.styles.ts'
import { useOpenServerSettings } from './serverSettingsContext.ts'

// The screen the desktop app shows when the server it runs isn't on (see apps/desktop/src/serverFailure.ts), in place
// of a login that would only fail: "O servidor não ligou", why, the log to look at, and "Tentar de novo", which starts
// the server again and opens the app once it answers, or shows why it still isn't on. When another program holds the
// port, it also offers "Usar outra porta", which opens the Servidor dialog on its port field, and the guide's section
// on it. When the SQLite key isn't on this computer, or doesn't open the data, it asks for the recovery copy the app
// showed the first time: "Usar a chave de recuperação" checks it opens the data, keeps it and opens the app, or says
// why not. It asks on opening, in case the server failed before the page loaded, and hears when it fails later. In a
// browser, or while the server is on, nothing is drawn.

/** The failures a recovery copy of the SQLite key mends. */
const KEY_FAILURES: readonly Failure['kind'][] = ['key', 'keyMissing', 'keyWrong']
/** The home server guide's section on a taken port and changing it. */
const PORT_GUIDE_URL = 'https://github.com/ChrisCamilo/apc-universal-repair/blob/main/docs/home-server.md#10-the-port-is-in-use'

type ServerFailureProps = {
  /** Opens the app again once the server answers. */
  reload?: () => void
}

export function ServerFailure({ reload = () => window.location.assign('/') }: ServerFailureProps) {
  const server = desktopBridge()?.server
  const openServerSettings = useOpenServerSettings()
  const [failure, setFailure] = useState<Failure | null>(null)
  const [retrying, setRetrying] = useState(false)
  // The recovery copy as typed, and why it was refused.
  const [recoveryKey, setRecoveryKey] = useState('')
  const [refused, setRefused] = useState<string>()
  const { classes, ids } = serverFailure()

  // Ask why the server isn't on, and hear when it stops being on later.
  useEffect(() => {
    if (!server) {
      return
    }
    void server.failure().then((found) => setFailure((shown) => shown ?? found))
    return server.onFailure(setFailure)
  }, [server])

  /** Starts the server again: opens the app once it answers, or shows why it still isn't on. */
  const retry = async () => {
    if (!server) {
      return
    }
    setRetrying(true)
    if (await server.retry()) {
      reload()
      return
    }
    setFailure(await server.failure())
    setRetrying(false)
  }

  /** Brings the key back from the recovery copy typed: opens the app once the server answers on it, or says why not. */
  const bringKeyBack = async () => {
    if (!server) {
      return
    }
    setRetrying(true)
    setRefused(undefined)
    const outcome = await server.useRecoveryKey(recoveryKey)
    if (outcome.ok) {
      reload()
      return
    }
    setRefused(outcome.message)
    setRetrying(false)
  }

  if (!failure) {
    return null
  }
  const keyFailure = KEY_FAILURES.includes(failure.kind)
  return (
    <div className={classes.base()} data-testid={ids.base}>
      {retrying ? (
        <Spinner label="Ligando o servidor" />
      ) : (
        <div className={classes.content()} data-testid={ids.content}>
          <ErrorState
            title="O servidor não ligou"
            message={failure.kind === 'portInUse' || keyFailure ? failure.reason : `${failure.reason} O registro do servidor está em ${failure.log}.`}
            action={{ label: 'Tentar de novo', onClick: () => void retry() }}
          />
          {failure.kind === 'portInUse' && (
            <div className={classes.more()} data-testid={ids.more}>
              <Button variant="secondary" size="sm" onClick={() => openServerSettings('port')}>
                Usar outra porta
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.open(PORT_GUIDE_URL, '_blank')}>
                Como liberar a porta
              </Button>
            </div>
          )}
          {keyFailure && (
            <div className={classes.recovery()} data-testid={ids.recovery}>
              <TextField
                label="Chave de recuperação"
                kind="password"
                value={recoveryKey}
                onValueChange={(typed) => {
                  setRecoveryKey(typed)
                  setRefused(undefined)
                }}
                helper="64 letras e números, em grupos de 8, como o app mostrou na primeira vez"
              />
              <Button size="sm" disabled={!recoveryKey.trim()} onClick={() => void bringKeyBack()}>
                Usar a chave de recuperação
              </Button>
              {refused && (
                <p role="alert" className={classes.note()} data-testid={ids.note}>
                  {refused}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
