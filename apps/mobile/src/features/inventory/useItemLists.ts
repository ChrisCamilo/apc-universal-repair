import {
  deleteListEntry,
  listName,
  mergeListEntries,
  renameListEntry,
  type ItemListKind,
  type ItemLists,
  type ListEntry,
} from '@apc/domain/lists';
import { apiUrl } from '../../app/api';
import { newId } from '../../app/ids';
import { enqueue } from './inventoryCopy';

// Changes the lists the item form picks from (categories, part brands, vehicle brands and vehicle models), which the
// Inventory reads from the phone's copy (see useInventoryCopy.tsx). A new name is queued (see @apc/domain/sync-queue),
// so it joins its list at once, also away from the server, and goes to it as soon as it can be reached. Renaming,
// merging and deleting go to the server, which moves the items along, as the phone can't foresee them: they need it,
// and the Inventory syncs after each one, so the lists follow.

/** Adds a name to a list, giving it as the list writes it; a vehicle model goes under its vehicle brand. */
export type CreateListEntry = (kind: ItemListKind, name: string, vehicleBrandId?: string) => Promise<ListEntry | null>;
/** Deletes an entry, telling whether it was deleted. */
export type RemoveListEntry = (kind: ItemListKind, id: string) => Promise<boolean>;
/** Merges an entry into another of its list: how many items moved, or null when it failed. */
export type MergeListEntries = (kind: ItemListKind, id: string, into: string) => Promise<number | null>;
/** Renames an entry: the entry renamed, "taken" when another entry has the name, or null when it failed. */
export type RenameListEntry = (kind: ItemListKind, id: string, name: string) => Promise<ListEntry | 'taken' | null>;

/**
 * Gives what changes the lists.
 * @param lists The lists as the Inventory shows them, to find a new vehicle model's brand.
 * @returns create, merge, rename and remove.
 */
export function useItemLists(lists: ItemLists): {
  create: CreateListEntry;
  merge: MergeListEntries;
  rename: RenameListEntry;
  remove: RemoveListEntry;
} {
  return {
    create: async (kind, name, vehicleBrandId) => {
      const written = listName(name);
      const vehicleBrand = lists.vehicleBrands.find((brand) => brand.id === vehicleBrandId)?.name;
      const id = newId();
      await enqueue([{ id, type: 'addName', kind, name: written, vehicleBrand, at: new Date().toISOString(), label: written }]);
      return { id, name: written };
    },
    merge: (kind, id, into) => mergeListEntries(apiUrl(), kind, id, into),
    rename: (kind, id, name) => renameListEntry(apiUrl(), kind, id, name),
    remove: (kind, id) => deleteListEntry(apiUrl(), kind, id),
  };
}
