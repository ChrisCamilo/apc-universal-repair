import { COMMON_TEXTS, COMPONENT_TEXTS } from '@apc/domain/app-texts'
import type { TutorialTarget } from '@apc/domain/inventory-tutorial'
import { INVENTORY_SCREEN_TEXTS } from '@apc/domain/inventory-texts'
import type { Locale } from '@apc/domain/locale'

// Where each part of the Inventory tab the tutorial points at is on the page: the marked buttons and fields
// (data-tour), the Filtros menu (on a phone, the filter sheet's "Ver itens", as the sheet itself fills the screen),
// and the test item's row and its buttons, found by their names in the language chosen.

/**
 * Finds a part of the Inventory tab on the page, for the tutorial to point at.
 * @param name The part.
 * @param code The test item's part code, for its row.
 * @param itemName The test item's name, which its row buttons are named after.
 * @param locale The language the page is in.
 * @returns The element, or null when it isn't on the page.
 */
export function tutorialTarget(name: TutorialTarget, code: string, itemName: string | undefined, locale: Locale): Element | null {
  const common = COMMON_TEXTS[locale]
  const show = COMPONENT_TEXTS[locale].filterSheet.show
  const row = () => [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent?.includes(code)) ?? null
  /** The field around an input marked for the tutorial. */
  const field = (mark: string) => document.querySelector(`[data-tour="${mark}"]`)?.closest('.grid') ?? null
  switch (name) {
    case 'new':
      return document.querySelector('[data-tour="new-item"]')
    case 'search':
      return document.querySelector('[data-tour="search"]')?.parentElement ?? null
    case 'filters':
      return document.querySelector('[data-tour="filters"], button[aria-haspopup="dialog"][aria-controls]')
    case 'filter-panel':
      return (
        document.querySelector(`[role="dialog"][aria-label="${INVENTORY_SCREEN_TEXTS[locale].filters}"]`) ??
        [...document.querySelectorAll('dialog[open] button')].find((button) => {
          const text = button.textContent ?? ''
          return text === show(Number(text.match(/\d+/)?.[0]))
        }) ??
        null
      )
    case 'form-identity':
      return field('form-code')
    case 'form-name':
      return field('form-name')
    case 'form-stock':
    case 'form-quantity':
      return field('form-quantity')
    case 'form-save':
    case 'form-edit':
    case 'form-delete':
    case 'confirm-delete':
      return document.querySelector(`[data-tour="${name}"]`)
    case 'row':
      return row()
    case 'pencil':
      return row()?.querySelector(`[aria-label="${common.editNamed(itemName ?? '')}"]`) ?? null
    case 'trash':
      return row()?.querySelector(`[aria-label="${common.deleteNamed(itemName ?? '')}"]`) ?? null
  }
}
