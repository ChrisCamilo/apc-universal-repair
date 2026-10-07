import { createContext, useContext, useState } from 'react'
import { REORDER_TABS_STORAGE_KEY } from '@apc/shared/tabs'
import { readStored, writeStored } from '../storage.ts'

/** The "Arrastar para reordenar" choice, shared by the Dashboard's tabs and the user menu that switches it. */
export const TabReorderContext = createContext<TabReorder | null>(null)

export type TabReorder = {
  reorderable: boolean
  /** Turns reordering on or off and saves the choice on the device. */
  setReorderable: (on: boolean) => void
}

/**
 * Holds the "Arrastar para reordenar" choice: read from the device once, off until turned on, saved on each change.
 * @returns The choice and its setter, for TabReorderContext.
 */
export function useReorderChoice(): TabReorder {
  const [reorderable, setState] = useState(() => readStored(REORDER_TABS_STORAGE_KEY) === 'true')
  return {
    reorderable,
    setReorderable: (on) => {
      setState(on)
      writeStored(REORDER_TABS_STORAGE_KEY, String(on))
    },
  }
}

/**
 * Reads the "Arrastar para reordenar" choice from the Dashboard around the caller.
 * @returns The choice and its setter.
 */
export function useTabReorder(): TabReorder {
  return useContext(TabReorderContext)!
}
