import { useState } from 'react'
import { hiddenColumns, ITEM_HIDDEN_COLUMNS_KEY } from '@apc/domain/item-filters'
import type { ItemSortKey } from '@apc/domain/items'
import { readStored, writeStored } from '../../app/storage.ts'

// The Inventory table's columns this device hides, remembered on it: Local until the "Colunas" menu shows it.

/**
 * Holds the columns the Inventory table hides, and remembers them on the device.
 * @returns The hidden columns' keys and the setter that also saves them.
 */
export function useHiddenColumns(): [ItemSortKey[], (hidden: ItemSortKey[]) => void] {
  const [hidden, setHidden] = useState(() => hiddenColumns(readStored(ITEM_HIDDEN_COLUMNS_KEY)))
  const choose = (next: ItemSortKey[]) => {
    setHidden(next)
    writeStored(ITEM_HIDDEN_COLUMNS_KEY, JSON.stringify(next))
  }
  return [hidden, choose]
}
