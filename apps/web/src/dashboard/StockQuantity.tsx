import { QUANTITY_UNIT, STOCK_STATUS_SHORT, stockStatus } from '@apc/shared/items'
import { usePhone } from '../components/usePhone.ts'
import { inventoryTab } from './InventoryTab.styles.ts'

// An item's quantity in a list: the number on a desktop row; on a phone's card, with its stock status under it in its
// tone, "un.", "Baixo" or "Esgotado". The Inventory's list and the Catalog's parts found by code show it.

type StockQuantityProps = {
  quantity: number
  minQuantity: number
  /** Whether it takes the stock status's tone; a brand's row under its item doesn't, as the status is the item's. */
  tinted?: boolean
}

export function StockQuantity({ quantity, minQuantity, tinted = true }: StockQuantityProps) {
  const phone = usePhone()
  const status = tinted ? stockStatus(quantity, minQuantity) : null
  const { classes, ids } = inventoryTab({ stock: status ?? 'ok' })
  if (!phone) {
    return quantity
  }
  return (
    <span className={classes.quantity()} data-testid={ids.quantity}>
      <span className={classes.quantityValue()} data-testid={ids.quantityValue}>
        {quantity}
      </span>
      <span className={classes.quantityTag()} data-testid={ids.quantityTag}>
        {status ? STOCK_STATUS_SHORT[status] : QUANTITY_UNIT}
      </span>
    </span>
  )
}
