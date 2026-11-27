import type { HostInstance } from 'react-native';
import { importTutorialSteps, importTutorialTitle, type ImportTutorialScreen, type ImportTutorialTarget } from '@apc/domain/import-tutorial';
import { findTourTarget, Tour } from '../../../components/Tour';
import { BOTTOM_BAR_HEIGHT } from '../../dashboard/Dashboard.styles';
import { useLocale } from '../../../app/locale';

// The import tour on mobile, the same as the web: the shared steps (see importTutorialSteps) run by the Tour over the
// Inventory tab, which hands its screen over on every render. Its targets are the views marked for it: the header's
// "⋯", then the sheet's Importar Peças once it is open, Importar Peças' parts and the first test item's card. The card
// keeps clear of the Dashboard's bottom bar while the dialog is closed.

/** The marked view each part of the screen is, by its tourTarget name. */
const TARGET_VIEWS: Record<ImportTutorialTarget, string> = {
  'more-actions': 'more-actions',
  'import-template': 'import-template',
  'import-choose': 'import-choose',
  'import-preview': 'import-preview',
  'import-submit': 'import-submit',
  row: 'import-row',
};

type ImportTutorialProps = {
  open: boolean;
  /** Called on Skip and on Finish. */
  onClose: () => void;
  /** The Inventory tab as it is now; its target is filled in here. */
  screen: Omit<ImportTutorialScreen<HostInstance>, 'target'>;
};

/**
 * Finds a part of the screen the import tour points at: the sheet's Importar Peças while it is open, for Mais ações.
 * @param name The part.
 * @returns The view, or null when it isn't on screen.
 */
function importTarget(name: ImportTutorialTarget): HostInstance | null {
  return (name === 'more-actions' && findTourTarget('import-action')) || findTourTarget(TARGET_VIEWS[name]);
}

export function ImportTutorial({ open, onClose, screen }: ImportTutorialProps) {
  const { locale } = useLocale();
  const steps = importTutorialSteps(() => ({ ...screen, target: importTarget }), locale);
  return (
    <Tour open={open} onClose={onClose} steps={steps} parts={[importTutorialTitle(locale)]} bottomInset={screen.importer === null ? BOTTOM_BAR_HEIGHT : 0} />
  );
}
