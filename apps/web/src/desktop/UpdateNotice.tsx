import { useEffect, useState } from 'react'
import { ICON_SIZES, infoIcon } from '@apc/shared/icons'
import { Button } from '../components/Button.tsx'
import { Icon } from '../components/Icon.tsx'
import { desktopBridge } from './desktopBridge.ts'
import { updateNotice } from './UpdateNotice.styles.ts'

// The notice that a new version of the desktop app is ready (see UpdateNotice.styles.ts): "Nova versão X pronta. Ela
// será instalada quando você fechar o app.", with "Reiniciar agora", which closes the app and installs it at once, and
// "Depois", which only hides the notice: the version still goes in when the app closes. Its polite live region is in the
// page from the start, so screen readers announce the notice when it shows. In a browser there is no desktop bridge,
// and nothing is drawn.

export function UpdateNotice() {
  const bridge = desktopBridge()
  const [version, setVersion] = useState<string>()
  const [later, setLater] = useState(false)
  const { classes, ids } = updateNotice()

  // Hear when the new version is ready, at once if it already is.
  useEffect(() => bridge?.onUpdateReady(setVersion), [bridge])

  if (!bridge) {
    return null
  }
  return (
    <div role="status" className={classes.base()} data-testid={ids.base}>
      {version && !later && (
        <div className={classes.card()} data-testid={ids.card}>
          <Icon icon={infoIcon} size={ICON_SIZES.body} className={classes.icon()} />
          <p className={classes.message()} data-testid={ids.message}>
            Nova versão {version} pronta. Ela será instalada quando você fechar o app.
          </p>
          <div className={classes.actions()} data-testid={ids.actions}>
            <Button variant="ghost" size="sm" onClick={() => setLater(true)}>
              Depois
            </Button>
            <Button size="sm" onClick={() => bridge.restartToUpdate()}>
              Reiniciar agora
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
