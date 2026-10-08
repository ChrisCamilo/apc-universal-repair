import type { HostInstance } from 'react-native';
import { INVENTORY_TUTORIAL_PARTS, inventoryTutorialSteps, type TutorialScreen, type TutorialTarget } from '@apc/shared/inventory-tutorial';
import { Tour } from '../Tour';
import { findTourTarget } from '../tourTargets';

// The Inventory tutorial on mobile, the same as the web: the shared steps (see inventoryTutorialSteps) run by the
// Tour over the Inventory tab, which hands its screen over on every render; the Tour checks the latest steps, so
// they read the screen as it is now.

/** The marked view each part of the screen is, by its tourTarget name. */
const TARGET_VIEWS: Record<TutorialTarget, string> = {
  new: 'new-item',
  'form-identity': 'form-code',
  'form-stock': 'form-quantity',
  'form-name': 'form-name',
  'form-quantity': 'form-quantity',
  'form-save': 'form-save',
  'form-edit': 'form-edit',
  search: 'search',
  filters: 'filters',
  'filter-panel': 'filter-panel',
  row: 'tutorial-row',
  pencil: 'tutorial-pencil',
  trash: 'tutorial-trash',
  'confirm-delete': 'confirm-delete',
};

type InventoryTutorialProps = {
  open: boolean;
  /** Called on Skip and on Finish. */
  onClose: () => void;
  /** The Inventory tab as it is now; its target is filled in here. */
  screen: Omit<TutorialScreen<HostInstance>, 'target'>;
  /** Whether "Abrir item ao clicar na linha" is on, which adds the details steps. */
  opensOnRow: boolean;
};

export function InventoryTutorial({ open, onClose, screen, opensOnRow }: InventoryTutorialProps) {
  const steps = inventoryTutorialSteps(() => ({ ...screen, target: (name) => findTourTarget(TARGET_VIEWS[name]) }), opensOnRow);
  return <Tour open={open} onClose={onClose} steps={steps} parts={INVENTORY_TUTORIAL_PARTS} />;
}
