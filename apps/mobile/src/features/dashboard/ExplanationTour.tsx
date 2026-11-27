import type { HostInstance } from 'react-native';
import { explanationSteps, tutorialTitle, type ExplanationId } from '@apc/domain/tutorials';
import type { TourStep } from '@apc/ui-spec/tour';
import { findTourTarget, Tour } from '../../components/Tour';
import { useLocale } from '../../app/locale';
import { BOTTOM_BAR_HEIGHT } from './Dashboard.styles';

// An explanation the user menu's Tutoriais starts, the same as the web: the Tour with Next only, each step pointing at
// the view marked with its target (ref={tourTarget('more-actions')}), or in the middle of the screen when it has none
// or the view isn't on screen, such as a Catalog screen not open. The card header names the explanation, and keeps
// clear of the bottom bar.

type ExplanationTourProps = {
  /** The explanation running, or null for none. */
  id: ExplanationId | null;
  /** Called on Skip and on Finish. */
  onClose: () => void;
};

export function ExplanationTour({ id, onClose }: ExplanationTourProps) {
  const { locale } = useLocale();
  const steps: TourStep<HostInstance>[] = id
    ? explanationSteps(id, locale).map(({ id: step, target, title, text }) => ({
        id: step,
        part: 1,
        title,
        text,
        target: target ? () => findTourTarget(target) : undefined,
      }))
    : [];
  return <Tour open={id !== null} onClose={onClose} steps={steps} parts={id ? [tutorialTitle(id, locale)] : []} bottomInset={BOTTOM_BAR_HEIGHT} />;
}
