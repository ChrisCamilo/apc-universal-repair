import { createContext, useContext, useEffect, useState } from 'react';
import { INVENTORY_TUTORIAL_STORAGE_KEY } from '@apc/shared/inventory-tutorial';
import { themeStorage } from '../theme';

/** The Inventory tutorial's state, shared by the Inventory tab that runs it and the user menu that replays it. */
export const InventoryTutorialContext = createContext<InventoryTutorialChoice | null>(null);

export type InventoryTutorialChoice = {
  /** Whether the logged user has seen the tutorial, on any device; until then it runs by itself. */
  seen: boolean;
  /** Saves that the tutorial was shown. */
  setSeen: () => void;
  /** Whether the user menu asked for the tutorial again; the Inventory tab starts it and calls replayStarted. */
  replayAsked: boolean;
  /** Asks for the tutorial again, from the user menu. */
  replay: () => void;
  /** Marks the replay asked for as started. */
  replayStarted: () => void;
};

/**
 * Holds whether the logged user has seen the Inventory tutorial, from their session, which marks it once it runs, and
 * whether a replay was asked for, the same as the web. The key the device used to keep it under is removed.
 * @param seen Whether the logged user has seen the tutorial (SessionUser.inventoryTutorialSeen).
 * @param onSeen Marks it seen on the user.
 * @returns The state and its setters, for InventoryTutorialContext.
 */
export function useInventoryTutorialChoice(seen: boolean, onSeen: () => void): InventoryTutorialChoice {
  const [replayAsked, setReplayAsked] = useState(false);

  // The tutorial's state lives on the user now.
  useEffect(() => {
    themeStorage.removeItem(INVENTORY_TUTORIAL_STORAGE_KEY).catch(() => {});
  }, []);

  return {
    seen,
    setSeen: onSeen,
    replayAsked,
    replay: () => setReplayAsked(true),
    replayStarted: () => setReplayAsked(false),
  };
}

/**
 * Reads the Inventory tutorial's state from the Dashboard around the caller.
 * @returns The state and its setters.
 */
export function useInventoryTutorial(): InventoryTutorialChoice {
  return useContext(InventoryTutorialContext)!;
}
