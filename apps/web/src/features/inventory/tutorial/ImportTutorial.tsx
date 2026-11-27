import { INVENTORY_SCREEN_TEXTS } from '@apc/domain/inventory-texts'
import type { Locale } from '@apc/domain/locale'
import { importTutorialSteps, importTutorialTitle, type ImportTutorialScreen, type ImportTutorialTarget } from '@apc/domain/import-tutorial'
import { Tour } from '../../../components/Tour'
import { BOTTOM_BAR_HEIGHT } from '../../dashboard/DashboardLayout.styles.ts'
import { useLocale } from '../../../app/useLocale.ts'
import { tutorialTarget } from './tutorialTarget.ts'

// The import tour on the web: the shared steps (see importTutorialSteps) run by the Tour over the Inventory tab, which
// hands its screen over on every render, the same as the Inventory tutorial. Its targets are Mais ações (the toolbar's
// menu, or a phone's "⋯"), then its Importar Peças once the menu or the sheet is open, so the card doesn't cover it;
// Importar Peças' parts, marked with data-tour; and the first test item's row, found the same way as the Inventory
// tutorial's. On a phone the card keeps clear of the Dashboard's bottom bar while the dialog is
// closed.

type ImportTutorialProps = {
  open: boolean
  /** Called on Skip and on Finish. */
  onClose: () => void
  /** The Inventory tab as it is now; its target is filled in here. */
  screen: Omit<ImportTutorialScreen<Element>, 'target'>
  /** The first test item's part code, which its row is found by. */
  code: string
}

/**
 * Finds a part of the screen the import tour points at.
 * @param name The part.
 * @param code The first test item's part code, for its row.
 * @param locale The language the page is in.
 * @returns The element, or null when it isn't on the page.
 */
function importTarget(name: ImportTutorialTarget, code: string, locale: Locale): Element | null {
  if (name === 'row') {
    return tutorialTarget('row', code, undefined, locale)
  }
  if (name === 'more-actions') {
    const label = INVENTORY_SCREEN_TEXTS[locale].importItems
    const item = [...document.querySelectorAll('[role="menuitem"], dialog[open] button')].find((each) => each.textContent?.trim() === label)
    if (item) {
      return item
    }
  }
  return document.querySelector(`[data-tour="${name}"]`)
}

export function ImportTutorial({ open, onClose, screen, code }: ImportTutorialProps) {
  const { locale } = useLocale()
  const steps = importTutorialSteps(() => ({ ...screen, target: (name) => importTarget(name, code, locale) }), locale)
  return (
    <Tour
      open={open}
      onClose={onClose}
      steps={steps}
      parts={[importTutorialTitle(locale)]}
      bottomInset={screen.phone && screen.importer === null ? BOTTOM_BAR_HEIGHT : 0}
    />
  )
}
