import { useEffect, useState } from 'react'
import {
  createListEntry,
  deleteListEntry,
  EMPTY_ITEM_LISTS,
  loadItemLists,
  renameListEntry,
  withEntry,
  withoutEntry,
  type ItemListKind,
  type ItemLists,
  type ListEntry,
} from '@apc/shared/lists'
import { API_BASE } from './savePhotos.ts'

// Loads the lists the item form picks from (categories, part brands, vehicle brands and vehicle models), creates
// new names in them, renames and deletes, keeping each change in the lists at once. Lists that can't be loaded stay
// empty: the form then offers to create each name, and creating one the API already holds gives that one back.

/** Creates a name in a list, or finds it there; a vehicle model goes under its vehicle brand. */
export type CreateListEntry = (kind: ItemListKind, name: string, vehicleBrandId?: string) => Promise<ListEntry | null>
/** Deletes an entry, telling whether it was deleted. */
export type RemoveListEntry = (kind: ItemListKind, id: string) => Promise<boolean>
/** Renames an entry: the entry renamed, "taken" when another entry has the name, or null when it failed. */
export type RenameListEntry = (kind: ItemListKind, id: string, name: string) => Promise<ListEntry | 'taken' | null>

/**
 * Fetches the four lists once and keeps the changes made since.
 * @returns The lists, and create, rename and remove to change them.
 */
export function useItemLists(): { lists: ItemLists; create: CreateListEntry; rename: RenameListEntry; remove: RemoveListEntry } {
  const [lists, setLists] = useState<ItemLists>(EMPTY_ITEM_LISTS)

  useEffect(() => {
    const request = new AbortController()
    loadItemLists(API_BASE, request.signal)
      .then(setLists)
      .catch(() => {})
    return () => request.abort()
  }, [])

  return {
    lists,
    create: async (kind, name, vehicleBrandId) => {
      const entry = await createListEntry(API_BASE, kind, name, vehicleBrandId)
      if (entry) {
        setLists((held) => withEntry(held, kind, entry))
      }
      return entry
    },
    rename: async (kind, id, name) => {
      const renamed = await renameListEntry(API_BASE, kind, id, name)
      if (renamed && renamed !== 'taken') {
        setLists((held) => withEntry(held, kind, renamed))
      }
      return renamed
    },
    remove: async (kind, id) => {
      const removed = await deleteListEntry(API_BASE, kind, id)
      if (removed) {
        setLists((held) => withoutEntry(held, kind, id))
      }
      return removed
    },
  }
}
