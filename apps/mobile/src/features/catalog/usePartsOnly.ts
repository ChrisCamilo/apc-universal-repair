import { useEffect, useState } from 'react';
import { CATALOG_PARTS_ONLY_KEY } from '@apc/domain/catalog';
import { save, themeStorage } from '../../app/theme';

// Whether the Catalog shows only the vehicles some part fits, remembered on this device, the same as the web; off
// until turned on.

/**
 * Holds whether the Catalog shows only the vehicles some part fits, and remembers it on the device. Storage is read
 * once, on the first render.
 * @returns The choice (null until storage is read, so wait to show the catalog) and the setter that also saves it.
 */
export function usePartsOnly(): [boolean | null, (on: boolean) => void] {
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    themeStorage
      .getItem(CATALOG_PARTS_ONLY_KEY)
      .catch(() => null)
      .then((saved) => setOn((current) => current ?? saved === 'true'));
  }, []);

  const choose = (next: boolean) => {
    setOn(next);
    save(CATALOG_PARTS_ONLY_KEY, String(next));
  };
  return [on, choose];
}
