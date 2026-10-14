import { createContext, useContext, useEffect, useState } from 'react'
import { INVENTORY_TUTORIAL_STORAGE_KEY } from '@apc/shared/inventory-tutorial'
import { useSession } from '../auth/sessionContext.ts'
import { removeStored } from '../storage.ts'

/** The Inventory tutorial's state, shared by the Inventory tab that runs it and the user menu that replays it. */
export const InventoryTutorialContext = createContext<InventoryTutorialChoice | null>(null)

export type InventoryTutorialChoice = {
  /** Whether the logged user has seen the tutorial, on any device; until then it runs by itself. */
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
 * Holds whether the logged user has seen the Inventory tutorial, from their session, which marks it once it runs, and
 * whether a replay was asked for. The key the device used to keep it under is removed.
 * @returns The state and its setters, for InventoryTutorialContext.
 */
export function useInventoryTutorialChoice(): InventoryTutorialChoice {
  const { user, markInventoryTutorialSeen } = useSession()
  const [replayAsked, setReplayAsked] = useState(false)

  // The tutorial's state lives on the user now.
  useEffect(() => removeStored(INVENTORY_TUTORIAL_STORAGE_KEY), [])

  return {
    seen: user?.inventoryTutorialSeen ?? true,
    setSeen: markInventoryTutorialSeen,
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
