import { explanationSteps, tutorialTitle, type ExplanationId } from '@apc/domain/tutorials'
import type { TourStep } from '@apc/ui-spec/tour'
import { Tour } from '../../components/Tour'
import { usePhone } from '../../components/usePhone.ts'
import { useLocale } from '../../app/useLocale.ts'
import { BOTTOM_BAR_HEIGHT } from './DashboardLayout.styles.ts'

// An explanation the user menu's Tutoriais starts: the Tour with Next only, each step pointing at the part of the screen
// marked with its target (data-tour="more-actions"), or in the middle of the screen when it has none or the part isn't
// on screen, such as a Catalog screen not open on a phone. The card header names the explanation, and on a phone keeps
// clear of the bottom bar.

type ExplanationTourProps = {
  /** The explanation running, or null for none. */
  id: ExplanationId | null
  /** Called on Skip and on Finish. */
  onClose: () => void
}

export function ExplanationTour({ id, onClose }: ExplanationTourProps) {
  const { locale } = useLocale()
  const phone = usePhone()
  const steps: TourStep<Element>[] = id
    ? explanationSteps(id, locale).map(({ id: step, target, title, text }) => ({
        id: step,
        part: 1,
        title,
        text,
        target: target ? () => document.querySelector(`[data-tour="${target}"]`) : undefined,
      }))
    : []
  return (
    <Tour
      open={id !== null}
      onClose={onClose}
      steps={steps}
      parts={id ? [tutorialTitle(id, locale)] : []}
      bottomInset={phone ? BOTTOM_BAR_HEIGHT : 0}
    />
  )
}
