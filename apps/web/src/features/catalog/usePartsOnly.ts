import { useState } from 'react'
import { CATALOG_PARTS_ONLY_KEY } from '@apc/domain/catalog'
import { readStored, writeStored } from '../../app/storage.ts'

// Whether the Catalog shows only the vehicles some part fits, remembered on this device, off until turned on.

/**
 * Holds whether the Catalog shows only the vehicles some part fits, and remembers it on the device.
 * @returns The choice and the setter that also saves it.
 */
export function usePartsOnly(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(() => readStored(CATALOG_PARTS_ONLY_KEY) === 'true')
  const choose = (next: boolean) => {
    setOn(next)
    writeStored(CATALOG_PARTS_ONLY_KEY, String(next))
  }
  return [on, choose]
}
