import { useState } from 'react'
import { apiFetch } from '@apc/domain/auth'
import { itemCodes, type Item } from '@apc/domain/items'
import { COMMON_TEXTS } from '@apc/domain/app-texts'
import { INVENTORY_SCREEN_TEXTS } from '@apc/domain/inventory-texts'
import { useMessages } from '../../../app/useLocale.ts'
import { Button } from '../../../components/Button'
import { Dialog } from '../../../components/Dialog'
import { useToast } from '../../../components/Toast'
import { Text } from '../../../components/Typography'
import { refusalReason } from '@apc/domain/refusals'

// The confirmation that removes an item from the inventory, naming it and its code. Excluir sends the delete to
// the API, shows a toast and hands the removal over; Cancel and Escape close it with nothing changed. A failed
// delete keeps the dialog open and says so in a toast, so it can be tried again; an item another device already deleted
// is taken as deleted, the toast saying so.

type DeleteItemDialogProps = {
  open: boolean
  /** The item to delete. */
  item?: Item
  onClose: () => void
  /** Called once the API removed the item. */
  onDeleted: (item: Item) => void
}

export function DeleteItemDialog({ open, item, onClose, onDeleted }: DeleteItemDialogProps) {
  const toast = useToast()
  const texts = useMessages(INVENTORY_SCREEN_TEXTS).delete
  const common = useMessages(COMMON_TEXTS)
  const [deleting, setDeleting] = useState(false)

  /** Sends the delete, then announces it and hands it over, or says it failed. */
  const remove = async () => {
    if (!item) {
      return
    }
    setDeleting(true)
    const response = await apiFetch(`/api/items/${item.id}`, { method: 'DELETE' }).catch(() => null)
    setDeleting(false)
    if (response && !response.ok && (await refusalReason(response)) === 'itemNotFound') {
      toast.info(texts.gone(item.name))
      onDeleted(item)
      return
    }
    if (!response?.ok) {
      toast.error(texts.failed)
      return
    }
    toast.success(texts.done(item.name))
    onDeleted(item)
  }

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
          <Button variant="danger" size="sm" data-tour="confirm-delete" loading={deleting} onClick={remove}>
            {common.delete}
          </Button>
        </>
      }
    >
      <Text size="sm" tone="muted">
        {item && texts.text(item.name, itemCodes(item))}
      </Text>
    </Dialog>
  )
}
