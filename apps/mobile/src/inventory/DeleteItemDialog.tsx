import { useState } from 'react';
import { View } from 'react-native';
import type { Item } from '@apc/shared/items';
import { API_URL } from '../api';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { useToast } from '../Toast';
import { tourTarget } from '../tourTargets';
import { Text } from '../Typography';

// The confirmation that removes an item from the inventory, the same as the web: it names the item and its code.
// Excluir sends the delete to the API, shows a toast and hands the removal over; Cancel and the back button close
// it with nothing changed. A failed delete keeps the dialog open and says so in a toast, so it can be tried again.

type DeleteItemDialogProps = {
  open: boolean;
  /** The item to delete. */
  item?: Item;
  onClose: () => void;
  /** Called once the API removed the item. */
  onDeleted: (item: Item) => void;
};

export function DeleteItemDialog({ open, item, onClose, onDeleted }: DeleteItemDialogProps) {
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  /** Sends the delete, then announces it and hands it over, or says it failed. */
  const remove = async () => {
    if (!item) {
      return;
    }
    setDeleting(true);
    const response = await fetch(`${API_URL}/items/${item.id}`, { method: 'DELETE' }).catch(() => null);
    setDeleting(false);
    if (!response?.ok) {
      toast('Não foi possível excluir o item. Tente de novo.');
      return;
    }
    toast(`Item “${item.name}” excluído.`);
    onDeleted(item);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Excluir item?"
      size="confirm"
      actions={
        <>
          <Button variant="secondary" size="sm" onPress={onClose}>
            Cancelar
          </Button>
          <View ref={tourTarget('confirm-delete')} collapsable={false}>
            <Button variant="danger" size="sm" loading={deleting} onPress={remove}>
              Excluir
            </Button>
          </View>
        </>
      }
    >
      <Text size="sm" tone="muted">
        {`${item?.name} (${item?.code}) sai do estoque. Essa ação não pode ser desfeita.`}
      </Text>
    </Dialog>
  );
}
