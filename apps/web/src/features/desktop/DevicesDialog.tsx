import { useEffect, useState } from 'react'
import { DEVICE_MESSAGES, type Device } from '@apc/domain/devices'
import { formatDateTime } from '@apc/domain/locale'
import { useLocale } from '../../app/useLocale.ts'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { TextField } from '../../components/TextField'
import { Text } from '../../components/Typography'
import { COMMON_TEXTS } from '@apc/domain/app-texts'
import { listDevices, removeDevice, renameDevice } from './devices.ts'
import { DESKTOP_TEXTS } from './desktopTexts.ts'
import { devices as devicesRecipe } from './Devices.styles.ts'

// "Dispositivos", opened from the user menu on the server's computer: the authorized devices, each with its name over
// whose it is and when it last logged in, "Renomear", which turns the name into a field with "Salvar", and "Remover",
// which asks first and then ends the device's sessions, so it has to be authorized again. The device in use is
// marked and can't be removed from here. Opened in the web app's demo, or off the server's computer, the dialog says
// why it can't list them.

type DevicesDialogProps = {
  open: boolean
  onClose: () => void
}

export function DevicesDialog({ open, onClose }: DevicesDialogProps) {
  const [listed, setListed] = useState<Device[]>()
  const [note, setNote] = useState<string>()
  // The device being renamed and the name typed; the device asked about before removing it.
  const [renaming, setRenaming] = useState<{ id: string; name: string }>()
  const [removing, setRemoving] = useState<string>()
  const { classes, ids } = devicesRecipe()
  const { locale } = useLocale()
  const texts = DESKTOP_TEXTS[locale].devices
  const common = COMMON_TEXTS[locale]

  // List the devices each time the dialog opens.
  useEffect(() => {
    if (!open) {
      return
    }
    let live = true
    void listDevices(locale).then((outcome) => {
      if (live) {
        setListed(outcome.ok ? outcome.value.filter((device) => device.status === 'authorized') : undefined)
        setNote(outcome.ok ? undefined : outcome.message)
      }
    })
    return () => {
      live = false
    }
  }, [open, locale])

  /** Saves the name typed for the device being renamed. */
  const saveName = async () => {
    const outcome = await renameDevice(renaming!.id, renaming!.name, locale)
    if (!outcome.ok) {
      setNote(outcome.message)
      return
    }
    setListed((shown) => shown?.map((device) => (device.id === outcome.value.id ? outcome.value : device)))
    setRenaming(undefined)
  }

  /**
   * Removes a device, ending its sessions.
   * @param id The device.
   */
  const remove = async (id: string) => {
    const outcome = await removeDevice(id, locale)
    if (!outcome.ok) {
      setNote(outcome.message)
      return
    }
    setListed((shown) => shown?.filter((device) => device.id !== id))
    setRemoving(undefined)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={DEVICE_MESSAGES[locale].devices}
      closable
      actions={
        <Button variant="secondary" size="sm" onClick={onClose}>
          {common.close}
        </Button>
      }
    >
      <div className={classes.base()} data-testid={ids.base}>
        {listed && (
          <ul aria-label={texts.authorized} className={classes.list()} data-testid={ids.list}>
            {listed.map((device) => (
              <li key={device.id} className={classes.row()} data-testid={ids.row}>
                {renaming?.id === device.id ? (
                  <TextField label={texts.name} value={renaming.name} onValueChange={(name) => setRenaming({ id: device.id, name })} />
                ) : (
                  <div className={classes.about()} data-testid={ids.about}>
                    <Text>{device.current ? texts.current(device.name) : device.name}</Text>
                    <Text size="sm" tone="muted">
                      {device.displayName} · {device.lastUsedAt ? texts.lastUsed(formatDateTime(new Date(device.lastUsedAt), locale)) : texts.neverUsed}
                    </Text>
                  </div>
                )}
                <div className={classes.actions()} data-testid={ids.actions}>
                  {renaming?.id === device.id ? (
                    <>
                      <Button size="sm" onClick={() => void saveName()}>
                        {common.save}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setRenaming(undefined)}>
                        {common.cancel}
                      </Button>
                    </>
                  ) : removing === device.id ? (
                    <>
                      <Button variant="danger" size="sm" onClick={() => void remove(device.id)}>
                        {texts.removeAnyway}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setRemoving(undefined)}>
                        {common.cancel}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => setRenaming({ id: device.id, name: device.name })}>
                        {common.rename}
                      </Button>
                      {!device.current && (
                        <Button variant="secondary" size="sm" onClick={() => setRemoving(device.id)}>
                          {common.remove}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {removing && (
          <Text size="sm" tone="muted">
            {texts.removeHint}
          </Text>
        )}
        {note && (
          <p role="alert" className={classes.note()} data-testid={ids.note}>
            {note}
          </p>
        )}
      </div>
    </Dialog>
  )
}
