import { createContext, useContext, useState } from 'react'
import { INVENTORY_TUTORIAL_STORAGE_KEY } from '@apc/shared/inventory-tutorial'
import { readStored, writeStored } from '../storage.ts'

/** The Inventory tutorial's state, shared by the Inventory tab that runs it and the user menu that replays it. */
export const InventoryTutorialContext = createContext<InventoryTutorialChoice | null>(null)

export type InventoryTutorialChoice = {
  /** Whether the tutorial was shown on this device; until then it runs by itself. */
  seen: boolean
  /** Saves that the tutorial was shown. */
  setSeen: () => void
  /** Whether the user menu asked for the tutorial again; the Inventory tab starts it and calls replayStarted. */
  replayAsked: boolean
  /** Asks for the tutorial again, from the user menu. */
  replay: () => void
  /** Marks the replay asked for as started. */
  replayStarted: () => void
}

/**
 * Holds whether the Inventory tutorial was shown, read from the device once and saved when it runs, and whether a
 * replay was asked for.
 * @returns The state and its setters, for InventoryTutorialContext.
 */
export function useInventoryTutorialChoice(): InventoryTutorialChoice {
  const [seen, setState] = useState(() => readStored(INVENTORY_TUTORIAL_STORAGE_KEY) === 'true')
  const [replayAsked, setReplayAsked] = useState(false)
  return {
    seen,
    setSeen: () => {
      setState(true)
      writeStored(INVENTORY_TUTORIAL_STORAGE_KEY, 'true')
    },
    replayAsked,
    replay: () => setReplayAsked(true),
    replayStarted: () => setReplayAsked(false),
  }
}

/**
 * Reads the Inventory tutorial's state from the Dashboard around the caller.
 * @returns The state and its setters.
 */
export function useInventoryTutorial(): InventoryTutorialChoice {
  return useContext(InventoryTutorialContext)!
}
