import { createContext, useContext, useEffect, useState } from 'react';
import { INVENTORY_TUTORIAL_STORAGE_KEY } from '@apc/domain/inventory-tutorial';
import { isExplanation, type ExplanationId, type TourId, type TutorialId } from '@apc/domain/tutorials';
import { themeStorage } from '../../app/theme';

/** The tutorials' state, shared by the Dashboard, the user menu's Tutoriais that starts one and the tab that runs it. */
export const TutorialsContext = createContext<TutorialsChoice | null>(null);

/** A guided tour asked for: which, and whether it goes on through the next ones, until its tab starts it. */
export type TutorialRequest = { id: TourId; onward: boolean };
export type TutorialsChoice = {
  /** Whether the logged user has seen the Inventory tour, on any device; until then it runs by itself. */
  seen: boolean;
  /** Saves that the Inventory tour was shown. */
  setSeen: () => void;
  /** The guided tour asked for, which its tab starts (or refuses, without the server) and then calls started. */
  asked: TutorialRequest | null;
  /**
   * Asks for a tutorial; onward, its tour goes on through the next ones. The Dashboard opens its tab first, and runs an
   * explanation itself.
   */
  start: (id: TutorialId, onward?: boolean) => void;
  /** Marks the tour asked for as started. */
  started: () => void;
  /** The explanation running, which the Dashboard shows. */
  explaining: ExplanationId | null;
  /** Ends the explanation running. */
  explained: () => void;
};

/**
 * Holds whether the logged user has seen the Inventory tour, from their session, which marks it once it runs, the tour
 * asked for and the explanation running, the same as the web. The key the device used to keep the tour's state under is removed.
 * @param seen Whether the logged user has seen the tour (SessionUser.inventoryTutorialSeen).
 * @param onSeen Marks it seen on the user.
 * @returns The state and its setters, for TutorialsContext.
 */
export function useTutorialsChoice(seen: boolean, onSeen: () => void): TutorialsChoice {
  const [asked, setAsked] = useState<TutorialRequest | null>(null);
  const [explaining, setExplaining] = useState<ExplanationId | null>(null);

  // The tour's state lives on the user now.
  useEffect(() => {
    themeStorage.removeItem(INVENTORY_TUTORIAL_STORAGE_KEY).catch(() => {});
  }, []);

  return {
    seen,
    setSeen: onSeen,
    asked,
    start: (id, onward = false) => (isExplanation(id) ? setExplaining(id) : setAsked({ id, onward })),
    started: () => setAsked(null),
    explaining,
    explained: () => setExplaining(null),
  };
}

/**
 * Reads the tutorials' state from the Dashboard around the caller.
 * @returns The state and its setters.
 */
export function useTutorials(): TutorialsChoice {
  return useContext(TutorialsContext)!;
}
