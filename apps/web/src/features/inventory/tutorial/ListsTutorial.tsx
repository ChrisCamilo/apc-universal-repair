import { INVENTORY_SCREEN_TEXTS } from '@apc/domain/inventory-texts'
import type { Locale } from '@apc/domain/locale'
import { listsTutorialSteps, listsTutorialTitle, type ListsTutorialScreen, type ListsTutorialTarget } from '@apc/domain/lists-tutorial'
import { Tour } from '../../../components/Tour'
import { BOTTOM_BAR_HEIGHT } from '../../dashboard/DashboardLayout.styles.ts'
import { useLocale } from '../../../app/useLocale.ts'

// The lists tour on the web: the shared steps (see listsTutorialSteps) run by the Tour over the Inventory tab, which
// hands its screen over on every render, the same as the Inventory tutorial. Its targets are Mais ações (the toolbar's
// menu, or a phone's "⋯"), then its Gerenciar listas once the menu or the sheet is open, so the card doesn't cover it;
// a test category's row, or the field renaming it, and Juntar and Excluir in the questions, all marked with data-tour.
// On a phone the card keeps clear of the Dashboard's bottom bar while the dialog is closed.

type ListsTutorialProps = {
  open: boolean
  /** Called on Skip and on Finish. */
  onClose: () => void
  /** The Inventory tab as it is now; its target is filled in here. */
  screen: Omit<ListsTutorialScreen<Element>, 'target'>
}

/**
 * Finds a part of the screen the lists tour points at.
 * @param name The part.
 * @param locale The language the page is in.
 * @returns The element, or null when it isn't on the page.
 */
function listsTarget(name: ListsTutorialTarget, locale: Locale): Element | null {
  if (name === 'more-actions') {
    const label = INVENTORY_SCREEN_TEXTS[locale].lists.title
    const item = [...document.querySelectorAll('[role="menuitem"], dialog[open] button')].find((each) => each.textContent?.trim() === label)
    if (item) {
      return item
    }
  }
  const marked = document.querySelector(`[data-tour="${name}"]`)
  return marked ?? (name.startsWith('entry-') ? document.querySelector('[data-tour="list-rename"]') : null)
}

export function ListsTutorial({ open, onClose, screen }: ListsTutorialProps) {
  const { locale } = useLocale()
  const steps = listsTutorialSteps(() => ({ ...screen, target: (name) => listsTarget(name, locale) }), locale)
  return (
    <Tour
      open={open}
      onClose={onClose}
      steps={steps}
      parts={[listsTutorialTitle(locale)]}
      bottomInset={screen.phone && !screen.managing ? BOTTOM_BAR_HEIGHT : 0}
    />
  )
}
