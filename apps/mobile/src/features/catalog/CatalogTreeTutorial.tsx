import type { HostInstance } from 'react-native';
import type { CatalogNode } from '@apc/domain/catalog';
import {
  catalogTreeTutorialSteps,
  catalogTreeTutorialTitle,
  type CatalogTreeScreen,
  type CatalogTreeTarget,
} from '@apc/domain/catalog-tree-tutorial';
import { findTourTarget, Tour } from '../../components/Tour';
import { BOTTOM_BAR_HEIGHT } from '../dashboard/Dashboard.styles';
import { useLocale } from '../../app/locale';

// The Catalog tree tour on mobile, the same as the web: the shared steps (see catalogTreeTutorialSteps) run by the Tour
// over the Catalog tab, which hands its screen over on every render. A step points at the views marked for it: the save
// button of the form open, the one adding a level or a new engine's sheet; otherwise Novo modelo, the action sheet's
// action while it is open, the button adding an empty branch's first, or the node's "⋯". A node folded away in the tree
// leaves the card in the middle of the screen. The card keeps clear of the Dashboard's bottom bar.

type CatalogTreeTutorialProps = {
  open: boolean;
  /** Called on Skip and on Finish. */
  onClose: () => void;
  /** The Catalog tab as it is now; its target is filled in here. */
  screen: Omit<CatalogTreeScreen<HostInstance>, 'target'>;
};

/**
 * Finds a part of the screen the tour points at.
 * @param name The part.
 * @param node The node a level is added under, or the one moved.
 * @returns The view, or null when it isn't on screen.
 */
function treeTarget(
  name: CatalogTreeTarget,
  node: CatalogNode | undefined,
): HostInstance | null {
  const form = findTourTarget('catalog-form');
  if (form) {
    return form;
  }
  if (name === 'new-model') {
    return findTourTarget('catalog-new-model');
  }
  if (!node) {
    return null;
  }
  const action = findTourTarget(
    name === 'add-under' ? 'catalog-add' : 'catalog-move-up',
  );
  return (
    action ??
    (name === 'add-under'
      ? findTourTarget(`catalog-after ${node.id}`)
      : null) ??
    findTourTarget(`catalog-node ${node.id}`)
  );
}

export function CatalogTreeTutorial({
  open,
  onClose,
  screen,
}: CatalogTreeTutorialProps) {
  const { locale } = useLocale();
  const steps = catalogTreeTutorialSteps(
    () => ({ ...screen, target: treeTarget }),
    locale,
  );
  return (
    <Tour
      open={open}
      onClose={onClose}
      steps={steps}
      parts={[catalogTreeTutorialTitle(locale)]}
      bottomInset={BOTTOM_BAR_HEIGHT}
    />
  );
}
