import { useEffect, useRef } from 'react';
import type { Item } from '@apc/shared/items';
import { lowStockAlerts, lowStockKey, lowStockMessage, readLowStockWarned } from '@apc/shared/notifications';
import { save, themeStorage } from '../theme';
import { useNotify, useToast } from '../Toast';

/**
 * Warns about the items that reach their minimum stock, once while they stay there, the same as the web: each time the
 * stock loads, the items newly low make one warning. The first load, when the Inventory opens, only adds it to the
 * bell; after that (a save, an import) it also shows as a toast. The items already warned about are kept on the device
 * for each user.
 * @param items Every item in stock, or null while they load.
 * @param userId The logged user's id.
 */
export function useLowStockAlerts(items: readonly Item[] | null, userId: string): void {
  const toast = useToast();
  const notify = useNotify();
  // Whether the stock already loaded once since the Inventory opened.
  const loaded = useRef(false);

  // Check the stock each time it loads, against the items already warned about.
  useEffect(() => {
    if (!items) {
      return;
    }
    let live = true;
    const key = lowStockKey(userId);
    themeStorage
      .getItem(key)
      .catch(() => null)
      .then((saved) => {
        if (!live) {
          return;
        }
        const { alerts, warned } = lowStockAlerts(items, readLowStockWarned(saved));
        save(key, JSON.stringify(warned));
        if (alerts.length > 0) {
          const message = lowStockMessage(alerts);
          if (loaded.current) {
            toast.warning(message);
          } else {
            notify('warning', message);
          }
        }
        loaded.current = true;
      });
    return () => {
      live = false;
    };
  }, [items, userId, toast, notify]);
}
