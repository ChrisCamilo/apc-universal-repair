import { useEffect, useState } from 'react'
import { ErrorState } from '../components/EmptyState.tsx'
import { Spinner } from '../components/Spinner.tsx'
import { desktopBridge, type ServerFailure as Failure } from './desktopBridge.ts'
import { serverFailure } from './ServerFailure.styles.ts'

// The screen the desktop app shows when the server it runs isn't on (see apps/desktop/src/serverFailure.ts), in place
// of a login that would only fail: "O servidor não ligou", why, the log to look at, and "Tentar de novo", which starts
// the server again and opens the app once it answers, or shows why it still isn't on. It asks on opening, in case the
// server failed before the page loaded, and hears when it fails later. In a browser, or while the server is on,
// nothing is drawn.

type ServerFailureProps = {
  /** Opens the app again once the server answers. */
  reload?: () => void
}

export function ServerFailure({ reload = () => window.location.assign('/') }: ServerFailureProps) {
  const server = desktopBridge()?.server
  const [failure, setFailure] = useState<Failure | null>(null)
  const [retrying, setRetrying] = useState(false)
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

  if (!failure) {
    return null
  }
  return (
    <div className={classes.base()} data-testid={ids.base}>
      {retrying ? (
        <Spinner label="Ligando o servidor" />
      ) : (
        <ErrorState
          title="O servidor não ligou"
          message={`${failure.reason} O registro do servidor está em ${failure.log}.`}
          action={{ label: 'Tentar de novo', onClick: () => void retry() }}
        />
      )}
    </div>
  )
}
