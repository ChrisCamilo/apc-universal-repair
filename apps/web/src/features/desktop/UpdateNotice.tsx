import { useEffect, useState } from 'react'
import { ICON_SIZES, infoIcon } from '@apc/tokens/icons'
import { useMessages } from '../../app/useLocale.ts'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { desktopBridge } from './desktopBridge.ts'
import { updateNotice } from './UpdateNotice.styles.ts'
import { DESKTOP_TEXTS } from './desktopTexts.ts'

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
  const texts = useMessages(DESKTOP_TEXTS).update

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
            {texts.ready(version)}
          </p>
          <div className={classes.actions()} data-testid={ids.actions}>
            <Button variant="ghost" size="sm" onClick={() => setLater(true)}>
              {texts.later}
            </Button>
            <Button size="sm" onClick={() => bridge.restartToUpdate()}>
              {texts.restart}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
