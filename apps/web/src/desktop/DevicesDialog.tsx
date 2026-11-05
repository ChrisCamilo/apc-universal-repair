import { useEffect, useState } from 'react'
import { DEVICE_MESSAGES, type Device } from '@apc/shared/devices'
import { Button } from '../components/Button.tsx'
import { Dialog } from '../components/Dialog.tsx'
import { TextField } from '../components/TextField.tsx'
import { Text } from '../components/Typography.tsx'
import { listDevices, removeDevice, renameDevice } from './devices.ts'
import { devices as devicesRecipe } from './Devices.styles.ts'

// "Dispositivos", opened from the user menu on the server's computer: the authorized devices, each with its name over
// whose it is and when it last logged in, "Renomear", which turns the name into a field with "Salvar", and "Remover",
// which asks first and then ends the device's sessions, so it has to be authorized again. The device in use is
// marked and can't be removed from here. Opened in the web app's demo, or off the server's computer, the dialog says
// why it can't list them.

/** How a device's last login is written, e.g. "4 de nov. de 2026, 21:30". */
const LAST_USE = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })

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

  // List the devices each time the dialog opens.
  useEffect(() => {
    if (!open) {
      return
    }
    let live = true
    void listDevices().then((outcome) => {
      if (live) {
        setListed(outcome.ok ? outcome.value.filter((device) => device.status === 'authorized') : undefined)
        setNote(outcome.ok ? undefined : outcome.message)
      }
    })
    return () => {
      live = false
    }
  }, [open])

  /** Saves the name typed for the device being renamed. */
  const saveName = async () => {
    const outcome = await renameDevice(renaming!.id, renaming!.name)
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
    const outcome = await removeDevice(id)
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
      title={DEVICE_MESSAGES.devices}
      closable
      actions={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div className={classes.base()} data-testid={ids.base}>
        {listed && (
          <ul aria-label="Dispositivos autorizados" className={classes.list()} data-testid={ids.list}>
            {listed.map((device) => (
              <li key={device.id} className={classes.row()} data-testid={ids.row}>
                {renaming?.id === device.id ? (
                  <TextField label="Nome do dispositivo" value={renaming.name} onValueChange={(name) => setRenaming({ id: device.id, name })} />
                ) : (
                  <div className={classes.about()} data-testid={ids.about}>
                    <Text>{device.current ? `${device.name} (este dispositivo)` : device.name}</Text>
                    <Text size="sm" tone="muted">
                      {device.displayName} · {device.lastUsedAt ? `último uso em ${LAST_USE.format(new Date(device.lastUsedAt))}` : 'ainda não entrou'}
                    </Text>
                  </div>
                )}
                <div className={classes.actions()} data-testid={ids.actions}>
                  {renaming?.id === device.id ? (
                    <>
                      <Button size="sm" onClick={() => void saveName()}>
                        Salvar
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setRenaming(undefined)}>
                        Cancelar
                      </Button>
                    </>
                  ) : removing === device.id ? (
                    <>
                      <Button variant="danger" size="sm" onClick={() => void remove(device.id)}>
                        Remover mesmo assim
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setRemoving(undefined)}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => setRenaming({ id: device.id, name: device.name })}>
                        Renomear
                      </Button>
                      {!device.current && (
                        <Button variant="secondary" size="sm" onClick={() => setRemoving(device.id)}>
                          Remover
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
            Remover encerra as sessões do dispositivo. Para entrar de novo, ele precisa ser autorizado outra vez.
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
