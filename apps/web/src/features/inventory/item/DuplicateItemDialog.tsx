import { COMMON_TEXTS } from '@apc/domain/app-texts'
import { INVENTORY_SCREEN_TEXTS } from '@apc/domain/inventory-texts'
import { useMessages } from '../../../app/useLocale.ts'
import { Button } from '../../../components/Button'
import { Dialog } from '../../../components/Dialog'
import { Text } from '../../../components/Typography'

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
  const texts = useMessages(INVENTORY_SCREEN_TEXTS).duplicate
  const common = useMessages(COMMON_TEXTS)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={texts.title}
      size="confirm"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {common.cancel}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onDuplicate(false)}>
            {texts.dataOnly}
          </Button>
          <Button size="sm" onClick={() => onDuplicate(true)}>
            {texts.withPhotos}
          </Button>
        </>
      }
    >
      <Text size="sm" tone="muted">
        {texts.text(name)}
      </Text>
    </Dialog>
  )
}
