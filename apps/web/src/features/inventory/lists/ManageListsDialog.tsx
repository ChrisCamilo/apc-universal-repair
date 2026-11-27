import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { pencilIcon, trashIcon } from '@apc/tokens/icons'
import { entryFilters, type ItemFilters } from '@apc/domain/item-filters'
import type { Item } from '@apc/domain/items'
import {
  catalogDeleteNote,
  catalogMergeNote,
  entryChange,
  findEntry,
  ITEM_LIST_TEXTS,
  itemsUsing,
  type ItemListKind,
  type ItemLists,
  type ListEntry,
  type ListEntryChange,
  type VehicleModel,
} from '@apc/domain/lists'
import { LISTS_TUTORIAL_NAMES } from '@apc/domain/lists-tutorial'
import { Button } from '../../../components/Button'
import { RowAction } from '../../../components/DataTable'
import { Dialog } from '../../../components/Dialog'
import { TextField } from '../../../components/TextField'
import { useToast } from '../../../components/Toast'
import { Heading, Text } from '../../../components/Typography'
import { manageListsDialog } from './ManageListsDialog.styles.ts'
import type { MergeListEntries, RemoveListEntry, RenameListEntry } from './useItemLists.ts'
import { COMMON_TEXTS } from '@apc/domain/app-texts'
import { INVENTORY_SCREEN_TEXTS } from '@apc/domain/inventory-texts'
import { useLocale, useMessages } from '../../../app/useLocale.ts'

// The "Gerenciar listas" dialog of the Inventory tab, for fixing typos and cleaning up the lists the item form picks
// from: a section for categories, part brands, vehicle brands and vehicle models, the models grouped by their brand.
// Each name shows how many items use it. The pencil renames it in place, on a field with Salvar and Cancelar (Enter
// and Escape), refusing a blank name; the items using it take the new name. Renaming to the name of another entry
// (a model's, within its brand) asks to merge the two: Juntar moves every item to the other entry and deletes this one,
// a vehicle brand's models going along, and a vehicle brand or model of the catalog taking its place and trees there
// along, which the question says. The trash asks to confirm
// deleting a name no item uses (a vehicle brand with its models); a name items use can't be deleted, and the dialog
// says how many items use it, with "Ver itens" to show them in the list. Deleting a vehicle brand or model of the
// catalog takes it out of the catalog too, which the question says. A toast confirms each rename, merge and delete, and
// the owner hears of each rename and merge, for its filters.

const KINDS: ItemListKind[] = ['categories', 'partBrands', 'vehicleBrands', 'vehicleModels']
// The lists tour's test categories, by the name its steps point at their rows by.
const TOUR_ROWS: Record<string, string> = {
  [LISTS_TUTORIAL_NAMES.first]: 'entry-first',
  [LISTS_TUTORIAL_NAMES.renamed]: 'entry-renamed',
  [LISTS_TUTORIAL_NAMES.second]: 'entry-second',
}

/** An entry of one of the lists. */
type Entry = { kind: ItemListKind; entry: ListEntry | VehicleModel }
type ManageListsDialogProps = {
  open: boolean
  lists: ItemLists
  /** Every item in stock, to count the items using each name. */
  items: Item[]
  onRename: RenameListEntry
  onMerge: MergeListEntries
  onRemove: RemoveListEntry
  /** Called after a rename, a merge or a delete, so the inventory loads again; a rename or merge says what changed. */
  onChanged: (change?: ListEntryChange) => void
  /** Shows the items using a name in the list, with the filters given. */
  onShowItems: (filters: ItemFilters) => void
  onClose: () => void
  /** Called with whether the question to join is open and the name the question to delete asks about, e.g. for the lists tour. */
  onAskChange?: (ask: { merging: boolean; removing: string | null }) => void
}

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
  onAskChange,
}: ManageListsDialogProps) {
  const { locale } = useLocale()
  const screen = INVENTORY_SCREEN_TEXTS[locale].lists
  const common = COMMON_TEXTS[locale]
  const toast = useToast()
  const { classes, ids } = manageListsDialog()
  // The entry being renamed, with the name typed and its message.
  const [editing, setEditing] = useState<Entry & { name: string; error?: string }>()
  const [saving, setSaving] = useState(false)
  // The entry the merge dialog asks about, with the one that has the name typed.
  const [merging, setMerging] = useState<Entry & { into: ListEntry | VehicleModel }>()
  const [joining, setJoining] = useState(false)
  // The entry the delete dialog asks about.
  const [removing, setRemoving] = useState<Entry>()
  const [deleting, setDeleting] = useState(false)

  // Tell the owner which question is open.
  useEffect(() => {
    onAskChange?.({ merging: merging !== undefined, removing: removing?.entry.name ?? null })
  }, [merging, removing, onAskChange])

  /** Checks the typed name and renames the entry, asks to merge it into the entry that has the name, or says why not. */
  const rename = async () => {
    if (!editing) {
      return
    }
    const { kind, entry, name } = editing
    const texts = ITEM_LIST_TEXTS[locale][kind]
    const siblings: ListEntry[] =
      'vehicleBrandId' in entry ? lists.vehicleModels.filter((model) => model.vehicleBrandId === entry.vehicleBrandId) : lists[kind]
    if (!name.trim()) {
      setEditing({ ...editing, error: screen.name })
      return
    }
    const other = findEntry(siblings, name)
    if (other && other.id !== entry.id) {
      setMerging({ kind, entry, into: other })
      return
    }
    setSaving(true)
    const renamed = await onRename(kind, entry.id, name)
    setSaving(false)
    if (renamed === 'taken') {
      setEditing({ ...editing, error: texts.taken })
      return
    }
    if (!renamed) {
      toast.error(texts.renameFailed)
      return
    }
    setEditing(undefined)
    toast.success(texts.renamed(renamed.name))
    onChanged(entryChange(kind, entry, renamed.name, lists))
  }

  /** Merges the entry the merge dialog asks about into the other one, then says how many items moved. */
  const merge = async () => {
    if (!merging) {
      return
    }
    const { kind, entry, into } = merging
    const texts = ITEM_LIST_TEXTS[locale][kind]
    setJoining(true)
    const moved = await onMerge(kind, entry.id, into.id)
    setJoining(false)
    if (moved === null) {
      toast.error(texts.mergeFailed)
      return
    }
    setMerging(undefined)
    setEditing(undefined)
    toast.success(texts.merged(entry.name, into.name, moved))
    onChanged(entryChange(kind, entry, into.name, lists))
  }

  /** Deletes the entry the dialog asks about, then says so. */
  const remove = async () => {
    if (!removing) {
      return
    }
    const texts = ITEM_LIST_TEXTS[locale][removing.kind]
    setDeleting(true)
    const removed = await onRemove(removing.kind, removing.entry.id)
    setDeleting(false)
    if (!removed) {
      toast.error(texts.deleteFailed)
      return
    }
    setRemoving(undefined)
    toast.success(texts.deleted(removing.entry.name))
    onChanged()
  }

  /** Lists the rows of some entries of one list, or says there are none. */
  const rows = (kind: ItemListKind, entries: readonly (ListEntry | VehicleModel)[]) => (
    <ul className={classes.rows()} data-testid={ids.rows}>
      {entries.map((entry) =>
        editing?.entry.id === entry.id ? (
          <RenameRow
            key={entry.id}
            name={editing.name}
            label={screen.newName(entry.name)}
            error={editing.error}
            saving={saving}
            onNameChange={(name) => setEditing({ ...editing, name, error: undefined })}
            onSave={rename}
            onCancel={() => setEditing(undefined)}
          />
        ) : (
          <EntryRow
            key={entry.id}
            name={entry.name}
            uses={itemsUsing(items, kind, entry, lists)}
            tour={kind === 'categories' ? TOUR_ROWS[entry.name] : undefined}
            onRename={() => setEditing({ kind, entry, name: entry.name })}
            onRemove={() => setRemoving({ kind, entry })}
          />
        ),
      )}
    </ul>
  )

  const removingUses = removing ? itemsUsing(items, removing.kind, removing.entry, lists) : 0
  const blocked = removingUses > 0
  const leavesCatalog = removing ? catalogDeleteNote(removing.kind, removing.entry, locale) : null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={screen.title}
      closable
      actions={
        <Button variant="secondary" size="sm" onClick={onClose}>
          {common.close}
        </Button>
      }
    >
      {KINDS.map((kind) => (
        <section key={kind} aria-label={ITEM_LIST_TEXTS[locale][kind].title} className={classes.section()} data-testid={ids.section}>
          <Heading level={4}>{ITEM_LIST_TEXTS[locale][kind].title}</Heading>
          {lists[kind].length === 0 ? (
            <Text size="sm" tone="muted">
              {screen.nothing}
            </Text>
          ) : kind === 'vehicleModels' ? (
            lists.vehicleBrands
              .map((brand) => ({ brand, models: lists.vehicleModels.filter((model) => model.vehicleBrandId === brand.id) }))
              .filter(({ models }) => models.length > 0)
              .map(({ brand, models }) => (
                <div
                  key={brand.id}
                  role="group"
                  aria-label={screen.modelsOf(brand.name)}
                  className={classes.group()}
                  data-testid={ids.group}
                >
                  <Text size="sm" tone="muted">
                    {brand.name}
                  </Text>
                  {rows(kind, models)}
                </div>
              ))
          ) : (
            rows(kind, lists[kind])
          )}
        </section>
      ))}
      <Dialog
        open={removing !== undefined}
        onClose={() => setRemoving(undefined)}
        title={blocked ? screen.cantDelete : screen.deleteTitle(removing?.entry.name ?? '')}
        size="confirm"
        actions={
          blocked ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => setRemoving(undefined)}>
                {common.close}
              </Button>
              {removing && (
                <Button
                  size="sm"
                  onClick={() => {
                    setRemoving(undefined)
                    onShowItems(entryFilters(removing.kind, removing.entry, lists))
                  }}
                >
                  {screen.showItems}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={() => setRemoving(undefined)}>
                {common.cancel}
              </Button>
              <Button variant="danger" size="sm" data-tour="remove-confirm" loading={deleting} onClick={remove}>
                {common.delete}
              </Button>
            </>
          )
        }
      >
        {removing && (
          <Text size="sm" tone="muted">
            {removingUses > 0
              ? ITEM_LIST_TEXTS[locale][removing.kind].inUse(removing.entry.name, removingUses)
              : [ITEM_LIST_TEXTS[locale][removing.kind].confirmDelete(removing.entry.name), leavesCatalog].filter(Boolean).join(' ')}
          </Text>
        )}
      </Dialog>
      <Dialog
        open={merging !== undefined}
        onClose={() => setMerging(undefined)}
        title={screen.mergeTitle(merging?.entry.name ?? '', merging?.into.name ?? '')}
        size="confirm"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setMerging(undefined)}>
              {common.cancel}
            </Button>
            <Button size="sm" data-tour="merge" loading={joining} onClick={merge}>
              {screen.merge}
            </Button>
          </>
        }
      >
        {merging && (
          <Text size="sm" tone="muted">
            {[
              ITEM_LIST_TEXTS[locale][merging.kind].confirmMerge(merging.entry.name, merging.into.name, itemsUsing(items, merging.kind, merging.entry, lists)),
              catalogMergeNote(merging.kind, merging.entry, merging.into, locale),
            ]
              .filter(Boolean)
              .join(' ')}
          </Text>
        )}
      </Dialog>
    </Dialog>
  )
}

/** A name of a list, how many items use it, and its pencil and trash; `tour` marks it for a tutorial to point at. */
function EntryRow({ name, uses, tour, onRename, onRemove }: { name: string; uses: number; tour?: string; onRename: () => void; onRemove: () => void }) {
  const { classes, ids } = manageListsDialog()
  const screen = useMessages(INVENTORY_SCREEN_TEXTS).lists
  const common = useMessages(COMMON_TEXTS)
  return (
    <li className={classes.entry()} data-testid={ids.entry} data-tour={tour}>
      <span className={classes.name()} data-testid={ids.name} title={name}>
        {name}
      </span>
      <span className={classes.uses()} data-testid={ids.uses}>
        {screen.uses(uses)}
      </span>
      <span className={classes.actions()} data-testid={ids.actions}>
        <RowAction icon={pencilIcon} label={common.renameNamed(name)} onClick={onRename} />
        <RowAction icon={trashIcon} label={common.deleteNamed(name)} tone="danger" onClick={onRemove} />
      </span>
    </li>
  )
}

/** The field that renames a name in place, with Salvar and Cancelar; Enter saves and Escape cancels. */
function RenameRow({
  name,
  label,
  error,
  saving,
  onNameChange,
  onSave,
  onCancel,
}: {
  name: string
  label: string
  error?: string
  saving: boolean
  onNameChange: (name: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  const field = useRef<HTMLInputElement>(null)
  const { classes, ids } = manageListsDialog()
  const common = useMessages(COMMON_TEXTS)

  // Start on the field, with the name selected, ready to be typed over.
  useEffect(() => {
    field.current?.focus()
    field.current?.select()
  }, [])

  /** Saves on Enter, and on Escape cancels the rename only, not the dialog around it. */
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      onSave()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onCancel()
    }
  }

  return (
    <li className={classes.rename()} data-testid={ids.rename} data-tour="list-rename">
      <TextField ref={field} label={label} value={name} onValueChange={onNameChange} error={error} onKeyDown={onKeyDown} />
      <span className={classes.buttons()} data-testid={ids.buttons}>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          {common.cancel}
        </Button>
        <Button size="sm" loading={saving} onClick={onSave}>
          {common.save}
        </Button>
      </span>
    </li>
  )
}
