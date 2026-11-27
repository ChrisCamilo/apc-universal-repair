import type { HostInstance } from 'react-native';
import { photosTutorialSteps, photosTutorialTitle, type PhotosTutorialScreen, type PhotosTutorialTarget } from '@apc/domain/photos-tutorial';
import { findTourTarget, Tour } from '../../../components/Tour';
import { BOTTOM_BAR_HEIGHT } from '../../dashboard/Dashboard.styles';
import { useLocale } from '../../../app/locale';

// The photos tour on mobile, the same as the web: the shared steps (see photosTutorialSteps) run by the Tour over the
// Inventory tab, which hands its screen over on every render. Its targets are the views marked for it: the test item's
// card, the form's Editar and save, the photo field of its first brand and its first photo's ×. The card keeps clear of
// the Dashboard's bottom bar while the form is closed.

/** The marked view each part of the screen is, by its tourTarget name. */
const TARGET_VIEWS: Record<PhotosTutorialTarget, string> = {
  row: 'tutorial-row',
  'form-edit': 'form-edit',
  'form-photos': 'form-photos',
  'photo-remove': 'photo-remove',
  'form-save': 'form-save',
};

type PhotosTutorialProps = {
  open: boolean;
  /** Called on Skip and on Finish. */
  onClose: () => void;
  /** The Inventory tab as it is now; its target is filled in here. */
  screen: Omit<PhotosTutorialScreen<HostInstance>, 'target'>;
};

export function PhotosTutorial({ open, onClose, screen }: PhotosTutorialProps) {
  const { locale } = useLocale();
  const steps = photosTutorialSteps(() => ({ ...screen, target: (name) => findTourTarget(TARGET_VIEWS[name]) }), locale);
  return (
    <Tour open={open} onClose={onClose} steps={steps} parts={[photosTutorialTitle(locale)]} bottomInset={screen.form === null ? BOTTOM_BAR_HEIGHT : 0} />
  );
}
