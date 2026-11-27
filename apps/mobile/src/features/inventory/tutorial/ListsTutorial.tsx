import type { HostInstance } from 'react-native';
import { listsTutorialSteps, listsTutorialTitle, type ListsTutorialScreen, type ListsTutorialTarget } from '@apc/domain/lists-tutorial';
import { findTourTarget, Tour } from '../../../components/Tour';
import { BOTTOM_BAR_HEIGHT } from '../../dashboard/Dashboard.styles';
import { useLocale } from '../../../app/locale';

// The lists tour on mobile, the same as the web: the shared steps (see listsTutorialSteps) run by the Tour over the
// Inventory tab, which hands its screen over on every render. Its targets are the views marked for it: the header's
// "⋯", then the sheet's Gerenciar listas once it is open, a test category's row, or the field renaming it, and Juntar
// and Excluir in the questions. The card keeps clear of the Dashboard's bottom bar while the dialog is closed.

type ListsTutorialProps = {
  open: boolean;
  /** Called on Skip and on Finish. */
  onClose: () => void;
  /** The Inventory tab as it is now; its target is filled in here. */
  screen: Omit<ListsTutorialScreen<HostInstance>, 'target'>;
};

/**
 * Finds a part of the screen the lists tour points at: the sheet's Gerenciar listas while it is open, for Mais ações,
 * and the field renaming a test category in place of its row.
 * @param name The part.
 * @returns The view, or null when it isn't on screen.
 */
function listsTarget(name: ListsTutorialTarget): HostInstance | null {
  if (name === 'more-actions') {
    return findTourTarget('lists-action') ?? findTourTarget(name);
  }
  return findTourTarget(name) ?? (name.startsWith('entry-') ? findTourTarget('list-rename') : null);
}

export function ListsTutorial({ open, onClose, screen }: ListsTutorialProps) {
  const { locale } = useLocale();
  const steps = listsTutorialSteps(() => ({ ...screen, target: listsTarget }), locale);
  return <Tour open={open} onClose={onClose} steps={steps} parts={[listsTutorialTitle(locale)]} bottomInset={screen.managing ? 0 : BOTTOM_BAR_HEIGHT} />;
}
