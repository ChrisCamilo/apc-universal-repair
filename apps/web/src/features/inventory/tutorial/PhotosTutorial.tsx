import { COMPONENT_TEXTS } from '@apc/domain/app-texts'
import type { Locale } from '@apc/domain/locale'
import { photosTutorialSteps, photosTutorialTitle, type PhotosTutorialScreen, type PhotosTutorialTarget } from '@apc/domain/photos-tutorial'
import { Tour } from '../../../components/Tour'
import { BOTTOM_BAR_HEIGHT } from '../../dashboard/DashboardLayout.styles.ts'
import { useLocale } from '../../../app/useLocale.ts'
import { tutorialTarget } from './tutorialTarget.ts'

// The photos tour on the web: the shared steps (see photosTutorialSteps) run by the Tour over the Inventory tab, which
// hands its screen over on every render, the same as the Inventory tutorial. Its targets are the test item's row and
// its form's parts, found the same way, and the photo field of the form's first brand (data-tour="form-photos") with
// its first photo's ×. On a phone the card keeps clear of the Dashboard's bottom bar while the form is closed.

type PhotosTutorialProps = {
  open: boolean
  /** Called on Skip and on Finish. */
  onClose: () => void
  /** The Inventory tab as it is now; its target is filled in here. */
  screen: Omit<PhotosTutorialScreen<Element>, 'target'>
  /** The test item's part code and name, which its row is found by. */
  code: string
  itemName: string | undefined
}

/**
 * Finds a part of the screen the photos tour points at.
 * @param name The part.
 * @param code The test item's part code, for its row.
 * @param itemName The test item's name.
 * @param locale The language the page is in.
 * @returns The element, or null when it isn't on the page.
 */
function photosTarget(name: PhotosTutorialTarget, code: string, itemName: string | undefined, locale: Locale): Element | null {
  const field = document.querySelector('[data-tour="form-photos"]')
  switch (name) {
    case 'form-photos':
      return field
    case 'photo-remove':
      return field?.querySelector(`[aria-label="${COMPONENT_TEXTS[locale].imageUpload.remove(1)}"]`) ?? null
    default:
      return tutorialTarget(name, code, itemName, locale)
  }
}

export function PhotosTutorial({ open, onClose, screen, code, itemName }: PhotosTutorialProps) {
  const { locale } = useLocale()
  const steps = photosTutorialSteps(() => ({ ...screen, target: (name) => photosTarget(name, code, itemName, locale) }), locale)
  return (
    <Tour
      open={open}
      onClose={onClose}
      steps={steps}
      parts={[photosTutorialTitle(locale)]}
      bottomInset={screen.phone && screen.form === null ? BOTTOM_BAR_HEIGHT : 0}
    />
  )
}
