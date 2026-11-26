import { useEffect, useRef, useState } from 'react'
import { DEVICE_MESSAGES, type Device } from '@apc/domain/devices'
import { useLocale, useMessages } from '../../app/useLocale.ts'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { TextField } from '../../components/TextField'
import { Text } from '../../components/Typography'
import { desktopBridge } from './desktopBridge.ts'
import { authorizeDevice, listDevices, removeDevice } from './devices.ts'
import { DESKTOP_TEXTS } from './desktopTexts.ts'
import { devices as devicesRecipe } from './Devices.styles.ts'

// On the server's computer, while someone is logged in to the desktop app: a device waiting to be authorized (see
// @apc/domain/devices) shows "Autorizar este dispositivo?", with whose login it is, its short code to compare with
// the one on the device, and a name to give it, "Dispositivo <code>" when left blank. "Autorizar" lets it in, and
// it logs in by itself; "Recusar" removes it, and it is told so. Waiting devices are asked about every APPROVALS_POLL_MS,
// one at a time, oldest first, and each also gets a Windows notification once, shown while the window isn't focused.
// Off the server's computer, the API refuses the list, and nothing is asked again.

/** How often the waiting devices are listed, in milliseconds. */
const APPROVALS_POLL_MS = 5_000

export function DeviceApprovals() {
  const [waiting, setWaiting] = useState<Device[]>([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string>()
  // The devices a notification was shown for.
  const notified = useRef(new Set<string>())
  const { classes, ids } = devicesRecipe()
  const messages = useMessages(DEVICE_MESSAGES)
  const { locale } = useLocale()
  const texts = DESKTOP_TEXTS[locale].approvals

  // List the waiting devices now and every APPROVALS_POLL_MS, until the API says this isn't the server's computer.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let live = true
    const ask = async () => {
      const listed = await listDevices(locale)
      if (!live || (!listed.ok && listed.message !== DESKTOP_TEXTS[locale].devicesFailed.failed)) {
        return
      }
      if (listed.ok) {
        const pending = listed.value.filter((device) => device.status === 'pending').reverse()
        setWaiting(pending)
        for (const device of pending.filter(({ id }) => !notified.current.has(id))) {
          notified.current.add(device.id)
          desktopBridge()?.notify(texts.notice, texts.noticeText(device.displayName, device.code))
        }
      }
      timer = setTimeout(ask, APPROVALS_POLL_MS)
    }
    void ask()
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [locale, texts])

  const device = waiting[0]

  /**
   * Authorizes or refuses the device asked about, then asks about the next one.
   * @param authorize True to let it in, false to remove it.
   */
  const answer = async (authorize: boolean) => {
    setBusy(true)
    const outcome = authorize ? await authorizeDevice(device.id, name, locale) : await removeDevice(device.id, locale)
    setBusy(false)
    if (!outcome.ok) {
      setNote(outcome.message)
      return
    }
    setWaiting((shown) => shown.filter(({ id }) => id !== device.id))
    setName('')
    setNote(undefined)
  }

  return (
    <Dialog
      open={device !== undefined}
      onClose={() => {}}
      title={messages.approveTitle}
      size="confirm"
      actions={
        <>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => void answer(false)}>
            {texts.refuse}
          </Button>
          <Button size="sm" loading={busy} onClick={() => void answer(true)}>
            {texts.authorize}
          </Button>
        </>
      }
    >
      {device && (
        <div className={classes.base()} data-testid={ids.base}>
          <Text>
            {texts.text(device.displayName, device.username)}
          </Text>
          <p className={classes.code()} data-testid={ids.code}>
            {device.code}
          </p>
          <TextField
            label={texts.name}
            value={name}
            onValueChange={setName}
            helper={texts.nameHint(device.code)}
          />
          {note && (
            <p role="alert" className={classes.note()} data-testid={ids.note}>
              {note}
            </p>
          )}
        </div>
      )}
    </Dialog>
  )
}
