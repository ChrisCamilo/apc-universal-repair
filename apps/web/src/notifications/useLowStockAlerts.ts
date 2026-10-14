import { useEffect, useRef } from 'react'
import type { Item } from '@apc/shared/items'
import { lowStockAlerts, lowStockKey, lowStockMessage, readLowStockWarned } from '@apc/shared/notifications'
import { useNotify, useToast } from '../components/toastContext.ts'
import { readStored, writeStored } from '../storage.ts'

/**
 * Warns about the items that reach their minimum stock, once while they stay there: each time the stock loads, the
 * items newly low make one warning. The first load, when the Inventory opens, only adds it to the bell; after that
 * (a save, an import) it also shows as a toast. The items already warned about are kept on the device for each user.
 * @param items Every item in stock, or null while they load.
 * @param userId The logged user's id.
 */
export function useLowStockAlerts(items: readonly Item[] | null, userId: string): void {
  const toast = useToast()
  const notify = useNotify()
  // Whether the stock already loaded once since the Inventory opened.
  const loaded = useRef(false)

  // Check the stock each time it loads.
  useEffect(() => {
    if (!items) {
      return
    }
    const key = lowStockKey(userId)
    const { alerts, warned } = lowStockAlerts(items, readLowStockWarned(readStored(key)))
    writeStored(key, JSON.stringify(warned))
    if (alerts.length > 0) {
      const message = lowStockMessage(alerts)
      if (loaded.current) {
        toast.warning(message)
      } else {
        notify('warning', message)
      }
    }
    loaded.current = true
  }, [items, userId, toast, notify])
}
