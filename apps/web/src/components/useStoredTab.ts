import { useState } from 'react'
import { initialTab } from '@apc/shared/tabs'
import { readStored, writeStored } from '../storage.ts'

/**
 * Holds the selected tab and remembers it, so the page reopens on the last tab used.
 * @param storageKey localStorage key, e.g. DASHBOARD_TAB_STORAGE_KEY from @apc/shared/tabs.
 * @param ids Tab ids in display order; the first opens when nothing valid was saved.
 * @returns The selected tab id and the setter that also saves it.
 */
export function useStoredTab<T extends string>(storageKey: string, ids: readonly T[]): [T, (id: T) => void] {
  const [tab, setTab] = useState(() => initialTab(ids, readStored(storageKey)))
  const select = (id: T) => {
    setTab(id)
    writeStored(storageKey, id)
  }
  return [tab, select]
}
