import { Button } from '../../../components/Button';
import { Dialog } from '../../../components/Dialog';
import { Text } from '../../../components/Typography';
import { COMMON_TEXTS } from '@apc/domain/app-texts';
import { INVENTORY_SCREEN_TEXTS } from '@apc/domain/inventory-texts';
import { useMessages } from '../../../app/locale';
import { PHONE_TEXTS } from '../../../app/phoneTexts';

// The question an item's details ask before duplicating it, the same as the web: what the new item takes along. Copiar
// dados e fotos and Copiar só os dados hand the choice over, and the owner opens the new item's form filled in;
// Cancelar and the back button close it with nothing opened.

type DuplicateItemDialogProps = {
  open: boolean;
  /** The name of the item to duplicate. */
  name: string;
  onClose: () => void;
  /** Called with whether the new item takes the photos too. */
  onDuplicate: (withPhotos: boolean) => void;
};

export function DuplicateItemDialog({ open, name, onClose, onDuplicate }: DuplicateItemDialogProps) {
  const texts = useMessages(INVENTORY_SCREEN_TEXTS).duplicate;
  const phone = useMessages(PHONE_TEXTS).inventory;
  const common = useMessages(COMMON_TEXTS);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={texts.title}
      size="confirm"
      actions={
        <>
          <Button variant="secondary" size="sm" onPress={onClose}>
            {common.cancel}
          </Button>
          <Button variant="secondary" size="sm" onPress={() => onDuplicate(false)}>
            {texts.dataOnly}
          </Button>
          <Button size="sm" onPress={() => onDuplicate(true)}>
            {texts.withPhotos}
          </Button>
        </>
      }
    >
      <Text size="sm" tone="muted">
        {phone.duplicate(name)}
      </Text>
    </Dialog>
  );
}
