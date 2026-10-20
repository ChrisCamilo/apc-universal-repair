import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { TextInput, View } from 'react-native';
import { pencilIcon, trashIcon } from '@apc/shared/icons';
import { entryFilters, type ItemFilters } from '@apc/shared/item-filters';
import type { Item } from '@apc/shared/items';
import {
  CATALOG_BRAND_MESSAGE,
  CATALOG_MERGE_MESSAGE,
  entryChange,
  findEntry,
  isCatalogBrand,
  ITEM_LIST_TEXTS,
  itemsUsing,
  type ItemListKind,
  type ItemLists,
  type ListEntry,
  type ListEntryChange,
  type VehicleModel,
} from '@apc/shared/lists';
import { Button } from '../Button';
import { RowAction } from '../DataTable';
import { Dialog } from '../Dialog';
import { TextField } from '../TextField';
import { useToast } from '../Toast';
import { Heading, Text } from '../Typography';
import { useStyles } from './ManageListsDialog.styles';
import type { MergeListEntries, RemoveListEntry, RenameListEntry } from './useItemLists';

// The "Gerenciar listas" dialog of the Inventory tab, the same as the web: a section for categories, part brands,
// vehicle brands and vehicle models, the models grouped by their brand, each name with how many items use it. The
// pencil renames it in place, on a field with Salvar and Cancelar, refusing a blank name; the items using it take the
// new name. Renaming to the name of another entry (a model's, within its brand) asks to merge the two: Juntar moves
// every item to the other entry and deletes this one, a vehicle brand's models going along; a vehicle brand of the
// catalog can't be merged away. The trash asks to confirm deleting a name no item uses (a vehicle brand with its
// models); a name items use can't be deleted, and the dialog says how many items use it, with "Ver itens" to show
// them in the list; nor can a vehicle brand of the catalog. A toast confirms each rename, merge and delete, and the
// owner hears of each rename and merge, for its filters.

const KINDS: ItemListKind[] = ['categories', 'partBrands', 'vehicleBrands', 'vehicleModels'];

/** An entry of one of the lists. */
type Entry = { kind: ItemListKind; entry: ListEntry | VehicleModel };
type ManageListsDialogProps = {
  open: boolean;
  lists: ItemLists;
  /** Every item in stock, to count the items using each name. */
  items: Item[];
  onRename: RenameListEntry;
  onMerge: MergeListEntries;
  onRemove: RemoveListEntry;
  /** Called after a rename, a merge or a delete, so the inventory loads again; a rename or merge says what changed. */
  onChanged: (change?: ListEntryChange) => void;
  /** Shows the items using a name in the list, with the filters given. */
  onShowItems: (filters: ItemFilters) => void;
  onClose: () => void;
};

export function ManageListsDialog({
  open,
  lists,
  items,
  onRename,
  onMerge,
  onRemove,
  onChanged,
  onShowItems,
  onClose,
}: ManageListsDialogProps) {
  const { styles, ids } = useStyles();
  const toast = useToast();
  // The entry being renamed, with the name typed and its message.
  const [editing, setEditing] = useState<Entry & { name: string; error?: string }>();
  const [saving, setSaving] = useState(false);
  // The entry the merge dialog asks about, with the one that has the name typed.
  const [merging, setMerging] = useState<Entry & { into: ListEntry | VehicleModel }>();
  const [joining, setJoining] = useState(false);
  // The entry the delete dialog asks about.
  const [removing, setRemoving] = useState<Entry>();
  const [deleting, setDeleting] = useState(false);

  /** Checks the typed name and renames the entry, asks to merge it into the entry that has the name, or says why not. */
  const rename = async () => {
    if (!editing) {
      return;
    }
    const { kind, entry, name } = editing;
    const texts = ITEM_LIST_TEXTS[kind];
    const siblings: ListEntry[] =
      'vehicleBrandId' in entry ? lists.vehicleModels.filter((model) => model.vehicleBrandId === entry.vehicleBrandId) : lists[kind];
    if (!name.trim()) {
      setEditing({ ...editing, error: 'Informe o nome.' });
      return;
    }
    const other = findEntry(siblings, name);
    if (other && other.id !== entry.id) {
      if (kind === 'vehicleBrands' && isCatalogBrand(entry.name)) {
        setEditing({ ...editing, error: CATALOG_MERGE_MESSAGE(entry.name) });
        return;
      }
      setMerging({ kind, entry, into: other });
      return;
    }
    setSaving(true);
    const renamed = await onRename(kind, entry.id, name);
    setSaving(false);
    if (renamed === 'taken') {
      setEditing({ ...editing, error: texts.taken });
      return;
    }
    if (!renamed) {
      toast.error(texts.renameFailed);
      return;
    }
    setEditing(undefined);
    toast.success(texts.renamed(renamed.name));
    onChanged(entryChange(kind, entry, renamed.name, lists));
  };

  /** Merges the entry the merge dialog asks about into the other one, then says how many items moved. */
  const merge = async () => {
    if (!merging) {
      return;
    }
    const { kind, entry, into } = merging;
    const texts = ITEM_LIST_TEXTS[kind];
    setJoining(true);
    const moved = await onMerge(kind, entry.id, into.id);
    setJoining(false);
    if (moved === null) {
      toast.error(texts.mergeFailed);
      return;
    }
    setMerging(undefined);
    setEditing(undefined);
    toast.success(texts.merged(entry.name, into.name, moved));
    onChanged(entryChange(kind, entry, into.name, lists));
  };

  /** Deletes the entry the dialog asks about, then says so. */
  const remove = async () => {
    if (!removing) {
      return;
    }
    const texts = ITEM_LIST_TEXTS[removing.kind];
    setDeleting(true);
    const removed = await onRemove(removing.kind, removing.entry.id);
    setDeleting(false);
    if (!removed) {
      toast.error(texts.deleteFailed);
      return;
    }
    setRemoving(undefined);
    toast.success(texts.deleted(removing.entry.name));
    onChanged();
  };

  /** Lists the rows of some entries of one list. */
  const rows = (kind: ItemListKind, entries: readonly (ListEntry | VehicleModel)[]) =>
    entries.map((entry) =>
      editing?.entry.id === entry.id ? (
        <RenameRow
          key={entry.id}
          name={editing.name}
          label={`Novo nome de “${entry.name}”`}
          error={editing.error}
          saving={saving}
          onNameChange={(name) => setEditing({ ...editing, name, error: undefined })}
          onSave={rename}
          onCancel={() => setEditing(undefined)}
        />
      ) : (
        <View key={entry.id} style={styles.entry} testID={ids.entry}>
          <View style={styles.name} testID={ids.name}>
            <Text lines={1}>{entry.name}</Text>
          </View>
          <Text size="sm" tone="muted">
            {usesLabel(itemsUsing(items, kind, entry, lists))}
          </Text>
          <View style={styles.actions} testID={ids.actions}>
            <RowAction icon={pencilIcon} label={`Renomear ${entry.name}`} onPress={() => setEditing({ kind, entry, name: entry.name })} />
            <RowAction icon={trashIcon} label={`Excluir ${entry.name}`} tone="danger" onPress={() => setRemoving({ kind, entry })} />
          </View>
        </View>
      ),
    );

  const removingUses = removing ? itemsUsing(items, removing.kind, removing.entry, lists) : 0;
  const catalogBrand = removing?.kind === 'vehicleBrands' && isCatalogBrand(removing.entry.name);
  const blocked = catalogBrand || removingUses > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Gerenciar listas"
      closable
      actions={
        <Button variant="secondary" size="sm" onPress={onClose}>
          Fechar
        </Button>
      }
    >
      {KINDS.map((kind) => (
        <View key={kind} style={styles.section} testID={ids.section}>
          <Heading level={4}>{ITEM_LIST_TEXTS[kind].title}</Heading>
          {lists[kind].length === 0 ? (
            <Text size="sm" tone="muted">
              Nada cadastrado.
            </Text>
          ) : kind === 'vehicleModels' ? (
            lists.vehicleBrands
              .map((brand) => ({ brand, models: lists.vehicleModels.filter((model) => model.vehicleBrandId === brand.id) }))
              .filter(({ models }) => models.length > 0)
              .map(({ brand, models }) => (
                <View key={brand.id} accessibilityLabel={`Modelos de ${brand.name}`} style={styles.group} testID={ids.group}>
                  <Text size="sm" tone="muted">
                    {brand.name}
                  </Text>
                  {rows(kind, models)}
                </View>
              ))
          ) : (
            rows(kind, lists[kind])
          )}
        </View>
      ))}
      <Dialog
        open={removing !== undefined}
        onClose={() => setRemoving(undefined)}
        title={blocked ? 'Não é possível excluir' : `Excluir “${removing?.entry.name ?? ''}”?`}
        size="confirm"
        actions={
          blocked ? (
            <>
              <Button variant="secondary" size="sm" onPress={() => setRemoving(undefined)}>
                Fechar
              </Button>
              {!catalogBrand && removing && (
                <Button
                  size="sm"
                  onPress={() => {
                    setRemoving(undefined);
                    onShowItems(entryFilters(removing.kind, removing.entry, lists));
                  }}
                >
                  Ver itens
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onPress={() => setRemoving(undefined)}>
                Cancelar
              </Button>
              <Button variant="danger" size="sm" loading={deleting} onPress={remove}>
                Excluir
              </Button>
            </>
          )
        }
      >
        {removing && (
          <Text size="sm" tone="muted">
            {catalogBrand
              ? CATALOG_BRAND_MESSAGE(removing.entry.name)
              : removingUses > 0
                ? ITEM_LIST_TEXTS[removing.kind].inUse(removing.entry.name, removingUses)
                : ITEM_LIST_TEXTS[removing.kind].confirmDelete(removing.entry.name)}
          </Text>
        )}
      </Dialog>
      <Dialog
        open={merging !== undefined}
        onClose={() => setMerging(undefined)}
        title={`Juntar “${merging?.entry.name ?? ''}” com “${merging?.into.name ?? ''}”?`}
        size="confirm"
        actions={
          <>
            <Button variant="secondary" size="sm" onPress={() => setMerging(undefined)}>
              Cancelar
            </Button>
            <Button size="sm" loading={joining} onPress={merge}>
              Juntar
            </Button>
          </>
        }
      >
        {merging && (
          <Text size="sm" tone="muted">
            {ITEM_LIST_TEXTS[merging.kind].confirmMerge(
              merging.entry.name,
              merging.into.name,
              itemsUsing(items, merging.kind, merging.entry, lists),
            )}
          </Text>
        )}
      </Dialog>
    </Dialog>
  );
}

/**
 * Words how many items use a name.
 * @param uses How many items.
 * @returns E.g. "sem itens", "1 item", "3 itens".
 */
function usesLabel(uses: number): string {
  return uses === 0 ? 'sem itens' : uses === 1 ? '1 item' : `${uses} itens`;
}

/** The field that renames a name in place, with Salvar and Cancelar; the keyboard's return key saves. */
function RenameRow({
  name,
  label,
  error,
  saving,
  onNameChange,
  onSave,
  onCancel,
}: {
  name: string;
  label: string;
  error?: string;
  saving: boolean;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const field = useRef<ComponentRef<typeof TextInput>>(null);
  const { styles, ids } = useStyles();

  // Start on the field, ready to type.
  useEffect(() => {
    field.current?.focus();
  }, []);

  return (
    <View style={styles.rename} testID={ids.rename}>
      <TextField ref={field} label={label} value={name} onValueChange={onNameChange} error={error} onSubmitEditing={onSave} />
      <View style={styles.buttons} testID={ids.buttons}>
        <Button variant="secondary" size="sm" onPress={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" loading={saving} onPress={onSave}>
          Salvar
        </Button>
      </View>
    </View>
  );
}
