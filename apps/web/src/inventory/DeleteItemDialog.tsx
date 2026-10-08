import { useState } from 'react'
import type { Item } from '@apc/shared/items'
import { Button } from '../components/Button.tsx'
import { Dialog } from '../components/Dialog.tsx'
import { useToast } from '../components/toastContext.ts'
import { Text } from '../components/Typography.tsx'

// The confirmation that removes an item from the inventory, naming it and its code. Excluir sends the delete to
// the API, shows a toast and hands the removal over; Cancel and Escape close it with nothing changed. A failed
// delete keeps the dialog open and says so in a toast, so it can be tried again.

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
  const [deleting, setDeleting] = useState(false)

  /** Sends the delete, then announces it and hands it over, or says it failed. */
  const remove = async () => {
    if (!item) {
      return
    }
    setDeleting(true)
    const response = await fetch(`/api/items/${item.id}`, { method: 'DELETE' }).catch(() => null)
    setDeleting(false)
    if (!response?.ok) {
      toast('Não foi possível excluir o item. Tente de novo.')
      return
    }
    toast(`Item “${item.name}” excluído.`)
    onDeleted(item)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Excluir item?"
      size="confirm"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" size="sm" data-tour="confirm-delete" loading={deleting} onClick={remove}>
            Excluir
          </Button>
        </>
      }
    >
      <Text size="sm" tone="muted">
        {item?.name} ({item?.code}) sai do estoque. Essa ação não pode ser desfeita.
      </Text>
    </Dialog>
  )
}
