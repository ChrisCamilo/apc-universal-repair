import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { OPEN_ITEM_ON_ROW_STORAGE_KEY } from '@apc/shared/items';
import { save, themeStorage } from '../theme';

/** The "Abrir item ao clicar na linha" choice, shared by the Inventory tab's cards and the user menu that switches it. */
export const OpenItemOnRowContext = createContext<OpenItemOnRow | null>(null);

export type OpenItemOnRow = {
  opensOnRow: boolean;
  /** Turns opening on a card tap on or off and saves the choice on the device. */
  setOpensOnRow: (on: boolean) => void;
};

/**
 * Holds the "Abrir item ao clicar na linha" choice: read from the device once, on until turned off, saved on each
 * change.
 * @returns The choice and its setter, for OpenItemOnRowContext.
 */
export function useOpenItemOnRowChoice(): OpenItemOnRow {
  const [opensOnRow, setState] = useState(true);
  const switched = useRef(false);

  // Read the saved choice, unless it was already switched meanwhile.
  useEffect(() => {
    let live = true;
    themeStorage
      .getItem(OPEN_ITEM_ON_ROW_STORAGE_KEY)
      .then((saved) => live && !switched.current && setState(saved !== 'false'))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  return {
    opensOnRow,
    setOpensOnRow: (on) => {
      switched.current = true;
      setState(on);
      save(OPEN_ITEM_ON_ROW_STORAGE_KEY, String(on));
    },
  };
}

/**
 * Reads the "Abrir item ao clicar na linha" choice from the Dashboard around the caller.
 * @returns The choice and its setter.
 */
export function useOpenItemOnRow(): OpenItemOnRow {
  return useContext(OpenItemOnRowContext)!;
}
