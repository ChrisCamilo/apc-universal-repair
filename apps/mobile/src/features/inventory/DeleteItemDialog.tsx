import { useState } from 'react';
import { View } from 'react-native';
import { itemCodes, type Item } from '@apc/domain/items';
import { seenOf } from '@apc/domain/sync-conflicts';
import { newId } from '../../app/ids';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { useToast } from '../../components/Toast';
import { tourTarget } from '../../components/Tour';
import { Text } from '../../components/Typography';
import { enqueue } from './inventoryCopy';

// The confirmation that removes an item from the inventory, the same as the web: it names the item and its codes.
// Excluir queues the delete (see @apc/domain/sync-queue), which takes the item out of the Inventory at once and goes to
// the server as soon as it can be reached, with what the phone saw of the item, so a change made to it on the computer
// meanwhile conflicts instead of going with it (see @apc/domain/sync-conflicts); it shows a toast and hands the removal
// over. Cancel and the back button close it with nothing changed.

type DeleteItemDialogProps = {
  open: boolean;
  /** The item to delete. */
  item?: Item;
  onClose: () => void;
  /** Called once the delete is queued. */
  onDeleted: (item: Item) => void;
};

export function DeleteItemDialog({ open, item, onClose, onDeleted }: DeleteItemDialogProps) {
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  /** Queues the delete, then announces it and hands it over. */
  const remove = async () => {
    if (!item) {
      return;
    }
    setDeleting(true);
    await enqueue([{ id: newId(), type: 'deleteItem', itemId: item.id, seen: seenOf(item), at: new Date().toISOString(), label: item.name }]);
    setDeleting(false);
    toast.success(`Item “${item.name}” excluído.`);
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
        {`${item?.name} (${item && itemCodes(item)}) sai do estoque. Essa ação não pode ser desfeita.`}
      </Text>
    </Dialog>
  );
}
