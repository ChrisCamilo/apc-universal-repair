import { useEffect, useRef, useState } from 'react'
import { DEVICE_MESSAGES, type Device } from '@apc/shared/devices'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { TextField } from '../../components/TextField'
import { Text } from '../../components/Typography'
import { desktopBridge } from './desktopBridge.ts'
import { authorizeDevice, DEVICES_FAILED, listDevices, removeDevice } from './devices.ts'
import { devices as devicesRecipe } from './Devices.styles.ts'

// On the server's computer, while someone is logged in to the desktop app: a device waiting to be authorized (see
// @apc/shared/devices) shows "Autorizar este dispositivo?", with whose login it is, its short code to compare with
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

  // List the waiting devices now and every APPROVALS_POLL_MS, until the API says this isn't the server's computer.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let live = true
    const ask = async () => {
      const listed = await listDevices()
      if (!live || (!listed.ok && listed.message !== DEVICES_FAILED.failed)) {
        return
      }
      if (listed.ok) {
        const pending = listed.value.filter((device) => device.status === 'pending').reverse()
        setWaiting(pending)
        for (const device of pending.filter(({ id }) => !notified.current.has(id))) {
          notified.current.add(device.id)
          desktopBridge()?.notify('Dispositivo novo', `${device.displayName} quer entrar por um dispositivo novo, código ${device.code}.`)
        }
      }
      timer = setTimeout(ask, APPROVALS_POLL_MS)
    }
    void ask()
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [])

  const device = waiting[0]

  /**
   * Authorizes or refuses the device asked about, then asks about the next one.
   * @param authorize True to let it in, false to remove it.
   */
  const answer = async (authorize: boolean) => {
    setBusy(true)
    const outcome = authorize ? await authorizeDevice(device.id, name) : await removeDevice(device.id)
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
      title={DEVICE_MESSAGES.approveTitle}
      size="confirm"
      actions={
        <>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => void answer(false)}>
            Recusar
          </Button>
          <Button size="sm" loading={busy} onClick={() => void answer(true)}>
            Autorizar
          </Button>
        </>
      }
    >
      {device && (
        <div className={classes.base()} data-testid={ids.base}>
          <Text>
            {device.displayName} ({device.username}) quer entrar por um dispositivo novo. Autorize só se o código abaixo for
            o mesmo que aparece nele.
          </Text>
          <p className={classes.code()} data-testid={ids.code}>
            {device.code}
          </p>
          <TextField
            label="Nome do dispositivo"
            value={name}
            onValueChange={setName}
            helper={`Opcional. Sem nome, fica “Dispositivo ${device.code}”.`}
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
