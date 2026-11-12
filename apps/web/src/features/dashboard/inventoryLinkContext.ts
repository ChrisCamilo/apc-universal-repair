import { createContext, useContext } from 'react'
import type { InventoryLink } from '@apc/domain/catalog'

// What another tab asks the Inventory to show, which the Dashboard holds: the Catalog opens a part's details, or the
// parts that fit a car, with their filters on. The Dashboard keeps the link and opens the Inventory tab, and the
// Inventory takes the link once its items are in, then lets it go.

/** The link waiting for the Inventory, how a tab opens the Inventory on one, and how the Inventory lets it go. */
export type InventoryLinks = { link: InventoryLink | null; open: (link: InventoryLink) => void; taken: () => void }

/** The Dashboard's links to the Inventory; outside it, none waits and opening one does nothing. */
export const InventoryLinkContext = createContext<InventoryLinks>({ link: null, open: () => {}, taken: () => {} })

/**
 * Reads the link waiting for the Inventory, and how to open or let go of one.
 * @returns The Dashboard's links.
 */
export function useInventoryLink(): InventoryLinks {
  return useContext(InventoryLinkContext)
}
