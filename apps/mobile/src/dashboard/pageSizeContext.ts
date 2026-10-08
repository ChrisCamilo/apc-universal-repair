import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { PAGE_SIZE_STORAGE_KEY, PAGE_SIZES } from '@apc/shared/pagination';
import { save, themeStorage } from '../theme';

/** The "Itens por página" default, shared by the Inventory tab's list and the user menu that sets it. */
export const PageSizeContext = createContext<PageSizeChoice | null>(null);

export type PageSizeChoice = {
  pageSize: number;
  /** Sets the default page size and saves it on the device. */
  setPageSize: (size: number) => void;
};

/**
 * Holds the "Itens por página" default: read from the device once, 25 until set, saved on each change.
 * @returns The default and its setter, for PageSizeContext.
 */
export function usePageSizeChoice(): PageSizeChoice {
  const [pageSize, setState] = useState<number>(PAGE_SIZES[0]);
  const chosen = useRef(false);

  // Read the saved default, unless one was already chosen meanwhile.
  useEffect(() => {
    let live = true;
    themeStorage
      .getItem(PAGE_SIZE_STORAGE_KEY)
      .then((saved) => {
        if (live && !chosen.current && (PAGE_SIZES as readonly number[]).includes(Number(saved))) {
          setState(Number(saved));
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  return {
    pageSize,
    setPageSize: (size) => {
      chosen.current = true;
      setState(size);
      save(PAGE_SIZE_STORAGE_KEY, String(size));
    },
  };
}

/**
 * Reads the "Itens por página" default from the Dashboard around the caller.
 * @returns The default and its setter.
 */
export function usePageSize(): PageSizeChoice {
  return useContext(PageSizeContext)!;
}
