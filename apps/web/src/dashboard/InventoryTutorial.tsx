import {
  INVENTORY_TUTORIAL_PARTS,
  inventoryTutorialSteps,
  type TutorialScreen,
} from '@apc/shared/inventory-tutorial'
import { Tour } from '../components/Tour.tsx'

// The Inventory tutorial on the web: the shared steps (see inventoryTutorialSteps) run by the Tour over the Inventory
// tab, which hands its screen over on every render; the Tour checks the latest steps, so they read the screen as it
// is now.

type InventoryTutorialProps = {
  open: boolean
  /** Called on Skip and on Finish. */
  onClose: () => void
  /** The Inventory tab as it is now. */
  screen: TutorialScreen<Element>
  /** Whether "Abrir item ao clicar na linha" is on, which adds the details steps. */
  opensOnRow: boolean
}

export function InventoryTutorial({ open, onClose, screen, opensOnRow }: InventoryTutorialProps) {
  const steps = inventoryTutorialSteps(() => screen, opensOnRow)
  return <Tour open={open} onClose={onClose} steps={steps} parts={INVENTORY_TUTORIAL_PARTS} />
}
