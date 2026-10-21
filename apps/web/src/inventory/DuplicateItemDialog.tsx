import { Button } from '../components/Button.tsx'
import { Dialog } from '../components/Dialog.tsx'
import { Text } from '../components/Typography.tsx'

// The question an item's details ask before duplicating it: what the new item takes along. Copiar dados e fotos and
// Copiar só os dados hand the choice over, and the owner opens the new item's form filled in; Cancelar and Escape close
// it with nothing opened.

type DuplicateItemDialogProps = {
  open: boolean
  /** The name of the item to duplicate. */
  name: string
  onClose: () => void
  /** Called with whether the new item takes the photos too. */
  onDuplicate: (withPhotos: boolean) => void
}

export function DuplicateItemDialog({ open, name, onClose, onDuplicate }: DuplicateItemDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Duplicar item?"
      size="confirm"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onDuplicate(false)}>
            Copiar só os dados
          </Button>
          <Button size="sm" onClick={() => onDuplicate(true)}>
            Copiar dados e fotos
          </Button>
        </>
      }
    >
      <Text size="sm" tone="muted">
        Um item novo começa com os dados de {name}, sem os códigos e com o estoque zerado. Nada é salvo até você clicar em Salvar.
      </Text>
    </Dialog>
  )
}
